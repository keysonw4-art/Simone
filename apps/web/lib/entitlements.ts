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

/** Snapshot do acesso ativo do usuário (uma query). */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const now = new Date();
  const entitlements = await prisma.entitlement.findMany({
    where: { userId, expiresAt: { gt: now } },
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
  const now = new Date();
  const found = await prisma.entitlement.findFirst({
    where: {
      userId,
      expiresAt: { gt: now },
      OR: [{ scope: "ALL" }, { scope: "COURSE", courseId }],
    },
    select: { id: true },
  });
  return Boolean(found);
}

/** O usuário tem QUALQUER acesso ativo (para telas de "é assinante?"). */
export async function hasAnyActiveAccess(userId: string): Promise<boolean> {
  const now = new Date();
  const found = await prisma.entitlement.findFirst({
    where: { userId, expiresAt: { gt: now } },
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
  role: string,
): Promise<StudentAccess> {
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  const access = await getUserAccess(userId);
  const accessAll = isStaff || access.grantsAll;
  const hasAny = accessAll || access.courseIds.size > 0;

  return { accessAll, courseIds: access.courseIds, hasAny };
}

export function canAccess(access: StudentAccess, courseId: string): boolean {
  return access.accessAll || access.courseIds.has(courseId);
}
