import { prisma } from "@repo/database";
import type { PlanType } from "@repo/database";

export const TIER_ORDER: Record<PlanType, number> = {
  BASIC: 1,
  INTERMEDIATE: 2,
  PREMIUM: 3,
};

export const TIER_LABELS: Record<PlanType, string> = {
  BASIC: "Básico",
  INTERMEDIATE: "Intermediário",
  PREMIUM: "Premium",
};

export function canAccessTier(
  userTier: PlanType | null,
  requiredTier: PlanType,
): boolean {
  if (!userTier) return false;
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}

/**
 * Retorna o maior tier ativo do usuário (edge case: usuário com múltiplas subs).
 * ADMIN/SUPER_ADMIN não passam por aqui — trate no chamador.
 */
export async function getHighestActivePlanTier(
  userId: string,
): Promise<PlanType | null> {
  const active = await prisma.subscription.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { planType: true },
  });
  if (active.length === 0) return null;

  let highest: PlanType = active[0]!.planType;
  for (const sub of active) {
    if (TIER_ORDER[sub.planType] > TIER_ORDER[highest]) {
      highest = sub.planType;
    }
  }
  return highest;
}
