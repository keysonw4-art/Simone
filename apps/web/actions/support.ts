"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

const NewTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Assunto deve ter ao menos 3 caracteres")
    .max(120, "Assunto deve ter no máximo 120 caracteres"),
  body: z
    .string()
    .trim()
    .min(10, "Descreva sua dúvida com ao menos 10 caracteres")
    .max(5000, "Mensagem deve ter no máximo 5000 caracteres"),
});

const ReplyTicketSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Mensagem não pode estar vazia")
    .max(5000, "Mensagem deve ter no máximo 5000 caracteres"),
});

type NewFieldKey = "subject" | "body" | "form";
type ReplyFieldKey = "body" | "form";

export type NewTicketFormState =
  | { errors: Partial<Record<NewFieldKey, string>>; values?: { subject?: string; body?: string } }
  | undefined;

export type ReplyTicketFormState =
  | { errors: Partial<Record<ReplyFieldKey, string>> }
  | undefined;

function flatten<K extends string>(
  error: z.ZodError,
  keys: readonly K[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as K | undefined;
    if (k && keys.includes(k) && !out[k]) out[k] = issue.message;
  }
  return out;
}

async function requireStudent() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function createTicketAction(
  _prev: NewTicketFormState,
  formData: FormData,
): Promise<NewTicketFormState> {
  const user = await requireStudent();

  const parsed = NewTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      errors: flatten(parsed.error, ["subject", "body", "form"] as const),
      values: {
        subject: (formData.get("subject") as string) ?? "",
        body: (formData.get("body") as string) ?? "",
      },
    };
  }

  const { subject, body } = parsed.data;
  const year = new Date().getFullYear();
  let newTicketId: string;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const counter = await tx.ticketCounter.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });
      const publicId = `TKT-${year}-${String(counter.lastNumber).padStart(4, "0")}`;
      return tx.supportTicket.create({
        data: {
          publicId,
          userId: user.id,
          subject,
          status: "OPEN",
          messages: {
            create: { authorId: user.id, body, isInternal: false },
          },
        },
      });
    });
    newTicketId = ticket.id;
  } catch (error) {
    console.error("[support] create ticket failed:", error);
    return {
      errors: { form: "Não foi possível abrir o chamado. Tente novamente." },
      values: { subject, body },
    };
  }

  revalidatePath("/aluno/suporte");
  redirect(`/aluno/suporte/${newTicketId}`);
}

export async function replyTicketAction(
  ticketId: string,
  _prev: ReplyTicketFormState,
  formData: FormData,
): Promise<ReplyTicketFormState> {
  const user = await requireStudent();

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: user.id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!ticket) return { errors: { form: "Chamado não encontrado" } };
  if (ticket.status === "CLOSED") {
    return { errors: { form: "Este chamado está fechado" } };
  }

  const parsed = ReplyTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flatten(parsed.error, ["body", "form"] as const) };
  }

  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        body: parsed.data.body,
        isInternal: false,
      },
    });
  } catch (error) {
    console.error("[support] reply failed:", error);
    return { errors: { form: "Não foi possível enviar a mensagem." } };
  }

  revalidatePath(`/aluno/suporte/${ticketId}`);
  revalidatePath("/aluno/suporte");
  return { errors: {} };
}
