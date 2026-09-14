"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import type { TicketStatus } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const ReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Mensagem não pode estar vazia")
    .max(5000, "Mensagem deve ter no máximo 5000 caracteres"),
  isInternal: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
});

type ReplyFieldKey = "body" | "isInternal" | "form";
type ReplyFieldErrors = Partial<Record<ReplyFieldKey, string>>;

export type AdminReplyFormState =
  | { errors: ReplyFieldErrors }
  | undefined;

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

function flatten(error: z.ZodError): ReplyFieldErrors {
  const out: ReplyFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as ReplyFieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function adminReplyTicketAction(
  ticketId: string,
  _prev: AdminReplyFormState,
  formData: FormData,
): Promise<AdminReplyFormState> {
  const admin = await requireAdminOrRedirect();

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, deletedAt: null },
    select: { id: true, status: true, userId: true },
  });
  if (!ticket) return { errors: { form: "Chamado não encontrado" } };

  const parsed = ReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flatten(parsed.error) };
  }

  const { body, isInternal } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({
        data: { ticketId, authorId: admin.id, body, isInternal },
      });
      // Reply pública não-interna em OPEN bumps para IN_PROGRESS automaticamente
      if (!isInternal && ticket.status === "OPEN") {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: "IN_PROGRESS" },
        });
      }
      await logAuditEvent({ userId: admin.id, action: "ticket.reply", details: { ticketId, targetUserId: ticket.userId, isInternal } }, tx);
    });
  } catch (error) {
    console.error("[tickets] reply failed:", error);
    return { errors: { form: "Não foi possível enviar a resposta." } };
  }


  revalidatePath(`/suporte/${ticketId}`);
  revalidatePath("/suporte");
  return { errors: {} };
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  if (!VALID_STATUSES.includes(status)) return;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, deletedAt: null },
    select: { id: true, status: true, userId: true },
  });
  if (!ticket) return;
  if (ticket.status === status) return;

  await prisma.$transaction(async tx => {
    await tx.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      closedAt: status === "CLOSED" ? new Date() : null,
    },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "ticket.status_change",
    details: {
      ticketId,
      targetUserId: ticket.userId,
      from: ticket.status,
      to: status,
    },
  }, tx);
  });

  revalidatePath(`/suporte/${ticketId}`);
  revalidatePath("/suporte");
}
