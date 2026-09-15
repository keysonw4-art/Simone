import { prisma } from "@repo/database";

/**
 * Resolver de acesso do modelo comercial v2 (compra única + prazo).
 *
 * Um Entitlement ativo (expiraEm > agora) concede acesso:
 * - scope ALL   → tudo, dinâmico (Premium/Founder), inclui conteúdo futuro
 * - scope COURSE → um módulo (Course) específico
 */

export type UserAccess = {
  grantsAll: boolean;
  courseIds: Set<string>;
};

const EMPTY_ACCESS: UserAccess = { grantsAll: false, courseIds: new Set() };

/** Usuário existe e não está bloqueado/excluído? (choke point de bloqueio) */
async function isUserActive(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { blockedAt: true, deletedAt: true },
  });
  return Boolean(u && !u.blockedAt && !u.deletedAt);
}

/** Snapshot do acesso ativo do usuário (uma query). */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  // Bloqueio/exclusão corta o acesso imediatamente, sem depender da expiração
  // do JWT (a sessão pode durar dias). Aplicado aqui pois é o choke point de
  // todo acesso a conteúdo.
  if (!(await isUserActive(userId))) return { ...EMPTY_ACCESS, courseIds: new Set() };

  const now = new Date();
  const entitlements = await prisma.entitlement.findMany({
    where: { userId, expiresAt: { gt: now }, purchase: { status: 'PAID', accessSuspended: false } },
    select: { scope: true, courseId: true },
  });

  let grantsAll = false;
  const courseIds = new Set<string>();
  for (const e of entitlements) {
    if (e.scope === "ALL") grantsAll = true;
    else if (e.courseId) courseIds.add(e.courseId);
  }
  return { grantsAll, courseIds };
}

/** Existe entitlement ativo que cobre este módulo (Course)? */
export async function hasCourseEntitlement(
  userId: string,
  courseId: string,
): Promise<boolean> {
  if (!(await isUserActive(userId))) return false;
  const now = new Date();
  const found = await prisma.entitlement.findFirst({
    where: {
      userId,
      expiresAt: { gt: now },
      purchase: { status: 'PAID', accessSuspended: false },
      OR: [{ scope: "ALL" }, { scope: "COURSE", courseId }],
    },
    select: { id: true },
  });
  return Boolean(found);
}

/** O usuário tem QUALQUER acesso ativo (para telas de "é assinante?"). */
export async function hasAnyActiveAccess(userId: string): Promise<boolean> {
  if (!(await isUserActive(userId))) return false;
  const now = new Date();
  const found = await prisma.entitlement.findFirst({
    where: { userId, expiresAt: { gt: now }, purchase: { status: 'PAID', accessSuspended: false } },
    select: { id: true },
  });
  return Boolean(found);
}

/**
 * Acesso do aluno na área — fonte única de verdade. Baseado em entitlements
 * (modelo v2) + bypass de staff. Assinatura legada NÃO concede mais acesso:
 * o fallback antigo tratava qualquer assinante como "acesso a tudo".
 */
export type StudentAccess = {
  accessAll: boolean; // vê todos os módulos
  courseIds: Set<string>; // módulos específicos liberados
  hasAny: boolean; // tem algum acesso?
};

export async function resolveStudentAccess(
  userId: string,
): Promise<StudentAccess> {
  const current = await prisma.user.findFirst({
    where: { id: userId, blockedAt: null, deletedAt: null }, select: { role: true },
  });
  if (!current) return { accessAll: false, hasAny: false, courseIds: new Set() };
  const isStaff = current.role === 'ADMIN' || current.role === 'SUPER_ADMIN';

  const access = await getUserAccess(userId);
  const accessAll = isStaff || access.grantsAll;
  const hasAny = accessAll || access.courseIds.size > 0;

  return { accessAll, courseIds: access.courseIds, hasAny };
}

export function canAccess(access: StudentAccess, courseId: string): boolean {
  return access.accessAll || access.courseIds.has(courseId);
}

// ---------------------------------------------------------------------------
// Catálogo do aluno — hierarquia Curso (Product) → Módulos (Course).
// "Meus Cursos" mostra os PRODUTOS comprados, não os módulos soltos.
// Fonte de posse: as compras ativas do próprio usuário (escopo userId — sem
// IDOR); o acesso a cada módulo continua governado por resolveStudentAccess.
// ---------------------------------------------------------------------------

export type CatalogProduct = {
  slug: string;
  name: string;
  tagline: string | null;
  grantsAll: boolean;
  moduleCount: number;
};

export type CatalogAvulso = {
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
};

export type StudentCatalog = {
  accessAll: boolean;
  hasAny: boolean;
  products: CatalogProduct[];
  avulsos: CatalogAvulso[];
};

export async function getStudentCatalog(userId: string): Promise<StudentCatalog> {
  const access = await resolveStudentAccess(userId);
  if (!access.hasAny) {
    return { accessAll: access.accessAll, hasAny: false, products: [], avulsos: [] };
  }
  const now = new Date();

  let totalModulos = -1;
  const countAllModulos = async (): Promise<number> => {
    if (totalModulos < 0) {
      totalModulos = await prisma.course.count({
        where: { isArchived: false, deletedAt: null },
      });
    }
    return totalModulos;
  };

  // PRODUTOS comprados — a partir das compras ativas do PRÓPRIO usuário (mesma
  // condição de acesso: PAID, não suspensa, não expirada). Nunca confia em id
  // vindo do cliente.
  const purchases = await prisma.purchase.findMany({
    where: { userId, status: "PAID", accessSuspended: false, expiresAt: { gt: now } },
    orderBy: { purchasedAt: "desc" },
    select: {
      product: {
        select: {
          slug: true, name: true, tagline: true, grantsAll: true,
          _count: { select: { productCourses: true } },
        },
      },
    },
  });

  const productMap = new Map<string, CatalogProduct>();
  for (const p of purchases) {
    if (p.product && !productMap.has(p.product.slug)) {
      productMap.set(p.product.slug, {
        slug: p.product.slug,
        name: p.product.name,
        tagline: p.product.tagline,
        grantsAll: p.product.grantsAll,
        moduleCount: p.product.grantsAll
          ? await countAllModulos()
          : p.product._count.productCourses,
      });
    }
  }

  // Staff / grantsAll sem uma compra de produto atrelada → mostra todos os
  // produtos ativos como preview/carteira.
  if (access.accessAll && productMap.size === 0) {
    const all = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
      select: {
        slug: true, name: true, tagline: true, grantsAll: true,
        _count: { select: { productCourses: true } },
      },
    });
    for (const pr of all) {
      productMap.set(pr.slug, {
        slug: pr.slug, name: pr.name, tagline: pr.tagline, grantsAll: pr.grantsAll,
        moduleCount: pr.grantsAll ? await countAllModulos() : pr._count.productCourses,
      });
    }
  }

  return {
    accessAll: access.accessAll,
    hasAny: true,
    products: [...productMap.values()],
    avulsos: await accessibleAvulsos(access),
  };
}

/**
 * Módulos marcados como avulso (soldStandalone) que o aluno ACESSA — por
 * qualquer via (bundle, Founder/acesso total ou compra avulsa). Sempre
 * separados: quem tem acesso total vê todos, reforçando a sensação de um
 * produto mais completo. Recebe o acesso já resolvido pra evitar re-consulta.
 */
async function accessibleAvulsos(access: StudentAccess): Promise<CatalogAvulso[]> {
  if (!access.accessAll && access.courseIds.size === 0) return [];
  const courses = await prisma.course.findMany({
    where: {
      soldStandalone: true,
      isArchived: false,
      deletedAt: null,
      ...(access.accessAll ? {} : { id: { in: [...access.courseIds] } }),
    },
    orderBy: { createdAt: "desc" },
    select: { slug: true, title: true, description: true, thumbnail: true },
  });
  return courses.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
  }));
}

/** Versão pública: resolve o acesso e devolve os avulsos acessíveis. */
export async function getAccessibleAvulsos(userId: string): Promise<CatalogAvulso[]> {
  const access = await resolveStudentAccess(userId);
  return accessibleAvulsos(access);
}

export type OwnedProductModule = {
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  sectionCount: number;
  lessonsTotal: number;
  lessonsDone: number;
  progressPct: number;
};

export type OwnedProductView = {
  product: { slug: string; name: string; tagline: string | null; description: string | null };
  modulos: OwnedProductModule[];
};

/**
 * Carrega um Produto pelo slug SOMENTE se o usuário tem posse ativa dele
 * (compra PAID/não-suspensa/não-expirada) ou é staff/grantsAll. Retorna null
 * caso contrário — a página trata como notFound. É a barreira anti-IDOR da
 * página de produto (o slug vem da URL, então a posse é checada no servidor).
 */
export async function getOwnedProductBySlug(
  userId: string,
  slug: string,
): Promise<OwnedProductView | null> {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true, slug: true, name: true, tagline: true, description: true, grantsAll: true,
      productCourses: { orderBy: { order: "asc" }, select: { courseId: true } },
    },
  });
  if (!product) return null;

  const now = new Date();
  const access = await resolveStudentAccess(userId);

  let owns = access.accessAll; // staff ou grantsAll (acesso a tudo)
  if (!owns) {
    const bought = await prisma.purchase.findFirst({
      where: {
        userId, productId: product.id,
        status: "PAID", accessSuspended: false, expiresAt: { gt: now },
      },
      select: { id: true },
    });
    owns = Boolean(bought);
  }
  if (!owns) return null;

  // Módulos a exibir: grantsAll/staff → todos ativos; bundle → composição do
  // produto ∩ o que o aluno realmente pode acessar (na ORDEM definida no admin).
  const wantAll = product.grantsAll || access.accessAll;
  const orderedIds = product.productCourses.map((pc) => pc.courseId);
  const bundleIds = orderedIds.filter((id) => access.courseIds.has(id));

  const courseSelect = {
    id: true, slug: true, title: true, description: true, thumbnail: true, createdAt: true,
    modules: {
      where: { deletedAt: null },
      select: { lessons: { where: { deletedAt: null }, select: { id: true } } },
    },
  } as const;

  const courses =
    wantAll
      ? await prisma.course.findMany({
          where: { isArchived: false, deletedAt: null }, select: courseSelect,
        })
      : bundleIds.length
        ? await prisma.course.findMany({
            where: { id: { in: bundleIds }, isArchived: false, deletedAt: null }, select: courseSelect,
          })
        : [];

  // Ordena: bundle → pela ordem do ProductCourse (sequência de estudo do admin);
  // grantsAll → por data de criação (estável).
  if (wantAll) {
    courses.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else {
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    courses.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
  }

  // Progresso por módulo: 1 query pra todas as aulas concluídas do aluno.
  const allLessonIds = courses.flatMap((c) =>
    c.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  );
  const done = allLessonIds.length
    ? await prisma.progress.findMany({
        where: { userId, isCompleted: true, lessonId: { in: allLessonIds } },
        select: { lessonId: true },
      })
    : [];
  const doneSet = new Set(done.map((p) => p.lessonId));

  return {
    product: {
      slug: product.slug, name: product.name,
      tagline: product.tagline, description: product.description,
    },
    modulos: courses.map((c) => {
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const lessonsDone = lessonIds.filter((id) => doneSet.has(id)).length;
      return {
        slug: c.slug, title: c.title, description: c.description, thumbnail: c.thumbnail,
        sectionCount: c.modules.length,
        lessonsTotal: lessonIds.length,
        lessonsDone,
        progressPct: lessonIds.length ? Math.round((lessonsDone / lessonIds.length) * 100) : 0,
      };
    }),
  };
}
