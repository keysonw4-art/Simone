import { prisma, type Prisma } from "@repo/database";

type AuditEvent = { userId: string; action: string; details?: Record<string, unknown> };

export async function logAuditEvent(params: AuditEvent, tx: Prisma.TransactionClient = prisma): Promise<void> {
  await tx.auditLog.create({ data: { userId: params.userId, action: params.action,
    details: params.details ? JSON.stringify(params.details) : null } });
}

/** Sensitive mutations and their audit record either commit together or roll back. */
export async function mutateAndAudit<T>(params: AuditEvent, mutation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    const result = await mutation(tx);
    await logAuditEvent(params, tx);
    return result;
  });
}
