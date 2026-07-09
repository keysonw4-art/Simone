import { prisma } from "@repo/database";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type RateLimitCheck = {
  blocked: boolean;
  attempts: number;
  retryAfterSeconds: number;
};

/**
 * Consulta SystemLog em busca de failures recentes por (email, ip).
 * Bloqueia se qualquer um dos vetores atingiu MAX_ATTEMPTS no WINDOW_MS.
 * Mesma mensagem de erro é retornada — não vazamos ao atacante que ele foi
 * rate-limited especificamente.
 */
export async function checkLoginRateLimit(params: {
  email: string;
  origin: string;
}): Promise<RateLimitCheck> {
  const { email, origin } = params;
  const since = new Date(Date.now() - WINDOW_MS);

  // description é JSON.stringify({ reason, email }) — contém a substring literal
  const emailNeedle = `"email":${JSON.stringify(email)}`;

  const attempts = await prisma.systemLog.count({
    where: {
      event: "login_failure",
      createdAt: { gt: since },
      OR: [{ description: { contains: emailNeedle } }, { origin }],
    },
  });

  if (attempts < MAX_ATTEMPTS) {
    return { blocked: false, attempts, retryAfterSeconds: 0 };
  }

  const oldest = await prisma.systemLog.findFirst({
    where: {
      event: "login_failure",
      createdAt: { gt: since },
      OR: [{ description: { contains: emailNeedle } }, { origin }],
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const retryAfterMs = oldest
    ? WINDOW_MS - (Date.now() - oldest.createdAt.getTime())
    : WINDOW_MS;

  return {
    blocked: true,
    attempts,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}
