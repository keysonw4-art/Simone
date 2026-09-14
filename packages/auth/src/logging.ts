import { prisma } from "@repo/database";

export type LoginFailureReason =
  | "missing_credentials"
  | "user_not_found"
  | "user_deleted"
  | "user_blocked"
  | "no_password_set"
  | "wrong_password"
  | "rate_limited";

export function extractIp(request: Request | undefined): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function logLoginFailure(params: {
  email: string | null;
  reason: LoginFailureReason;
  origin: string;
  userId?: string;
}): Promise<void> {
  try {
    // Tentativas já bloqueadas são registradas sob um evento distinto para
    // NÃO alimentarem o próprio rate limit (senão a janela nunca zera enquanto
    // o usuário insiste). Só falhas genuínas contam como "login_failure".
    const event =
      params.reason === "rate_limited" ? "login_blocked" : "login_failure";
    await prisma.systemLog.create({
      data: {
        userId: params.userId ?? null,
        event,
        origin: params.origin,
        description: JSON.stringify({
          reason: params.reason,
          email: params.email,
        }),
      },
    });
  } catch (error) {
    console.error("[auth] failed to write SystemLog:", error);
  }
}
