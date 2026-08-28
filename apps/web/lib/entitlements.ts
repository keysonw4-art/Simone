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
