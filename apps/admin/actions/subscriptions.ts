"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const SubscriptionSchema = z.object({
  planType: z.enum(["BASIC", "INTERMEDIATE", "PREMIUM"], {
    errorMap: () => ({ message: "Selecione um plano válido" }),
  }),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "Data inválida",
    ),
});

type SubFieldKey = "planType" | "expiresAt" | "form";
type SubFieldErrors = Partial<Record<SubFieldKey, string>>;

export type SubscriptionFormState = { errors: SubFieldErrors } | undefined;

function flattenZod(error: z.ZodError): SubFieldErrors {
  const out: SubFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as SubFieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

export async function createSubscriptionAction(
  userId: string,
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const admin = await requireAdminOrRedirect();

  const parsed = SubscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flattenZod(parsed.error) };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!target) {
    return { errors: { form: "Aluno não encontrado" } };
  }

  const { planType, expiresAt: expiresAtStr } = parsed.data;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  const existing = await prisma.subscription.findFirst({
    where: { userId, planType, isActive: true },
    select: { id: true },
  });
  if (existing) {
    return {
      errors: {
        planType: `Aluno já possui assinatura ${planType} ativa`,
      },
    };
  }

  try {
    await prisma.subscription.create({
      data: { userId, planType, isActive: true, expiresAt },
    });
  } catch (error) {
    console.error("[subscriptions] create failed:", error);
    return {
      errors: { form: "Não foi possível criar a assinatura. Tente novamente." },
    };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "subscription.create",
    details: {
      targetUserId: userId,
      planType,
      expiresAt: expiresAt?.toISOString() ?? null,
    },
  });

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${userId}`);
  revalidatePath("/assinaturas");

  return { errors: {} };
}

export type ToggleSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function toggleSubscriptionAction(
  subscriptionId: string,
): Promise<ToggleSubscriptionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Acesso negado." };
    }
    throw error;
  }

  const current = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      expiresAt: true,
      planType: true,
    },
  });
  if (!current) {
    return { ok: false, error: "Assinatura não encontrada." };
  }

  const nextActive = !current.isActive;
  const isReactivatingExpired =
    nextActive &&
    current.expiresAt !== null &&
    current.expiresAt.getTime() <= Date.now();

  const data: Prisma.SubscriptionUpdateInput = { isActive: nextActive };
  if (isReactivatingExpired) {
    data.expiresAt = null;
  }

  try {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data,
    });
  } catch (error) {
    console.error("[subscriptions] toggle failed:", error);
    return { ok: false, error: "Não foi possível alterar a assinatura." };
  }

  await logAuditEvent({
    userId: admin.id,
    action: nextActive ? "subscription.activate" : "subscription.deactivate",
    details: {
      subscriptionId,
      targetUserId: current.userId,
      planType: current.planType,
      clearedExpiresAt: isReactivatingExpired,
    },
  });

  revalidatePath(`/alunos/${current.userId}`);
  revalidatePath("/assinaturas");

  return { ok: true };
}
