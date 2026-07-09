import { prisma } from "@repo/database";

export async function logAuditEvent(params: {
  userId: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write AuditLog:", error);
  }
}
