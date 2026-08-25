"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const PlanSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(60),
  tagline: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("")),
  priceCents: z
    .string()
    .trim()
    .regex(/^\d+$/, "Preço deve ser um número inteiro em centavos")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0).max(99999999)),
  benefits: z
    .string()
    .trim()
    .min(1, "Liste ao menos 1 benefício")
    .max(4000),
  stripePriceId: z
    .string()
    .trim()
    .max(255)
    .regex(/^price_[A-Za-z0-9]+$/, "Price ID deve começar com 'price_'")
    .optional()
    .or(z.literal("")),
  highlight: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  isActive: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  order: z
    .string()
    .trim()
    .regex(/^\d+$/, "Ordem deve ser um inteiro")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0).max(999)),
});

type FieldKey =
  | "name"
  | "tagline"
  | "priceCents"
  | "benefits"
  | "stripePriceId"
  | "highlight"
  | "isActive"
  | "order"
  | "form";
type PlanFieldErrors = Partial<Record<FieldKey, string>>;
type PlanValues = Partial<
  Record<
    "name" | "tagline" | "priceCents" | "benefits" | "stripePriceId" | "order",
    string
  > & { highlight: boolean; isActive: boolean }
>;

export type PlanFormState =
  | { errors: PlanFieldErrors; values?: PlanValues }
  | undefined;

function flattenZod(error: z.ZodError): PlanFieldErrors {
  const out: PlanFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

function valuesFrom(formData: FormData): PlanValues {
  return {
    name: (formData.get("name") as string) ?? "",
    tagline: (formData.get("tagline") as string) ?? "",
    priceCents: (formData.get("priceCents") as string) ?? "",
    benefits: (formData.get("benefits") as string) ?? "",
    stripePriceId: (formData.get("stripePriceId") as string) ?? "",
    order: (formData.get("order") as string) ?? "",
    highlight: formData.get("highlight") === "on",
    isActive: formData.get("isActive") === "on",
  };
}

function benefitsTextToJson(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return JSON.stringify(lines);
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

export async function updatePlanAction(
  planId: string,
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const admin = await requireAdminOrRedirect();

  const existing = await prisma.plan.findFirst({
    where: { id: planId, deletedAt: null },
    select: { id: true, type: true },
  });
  if (!existing) return { errors: { form: "Plano não encontrado" } };

  const parsed = PlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };
  }

  const {
    name,
    tagline,
    priceCents,
    benefits,
    stripePriceId,
    highlight,
    isActive,
    order,
  } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (highlight) {
        await tx.plan.updateMany({
          where: { id: { not: planId }, deletedAt: null },
          data: { highlight: false },
        });
      }

      await tx.plan.update({
        where: { id: planId },
        data: {
          name,
          tagline: tagline || null,
          priceCents,
          benefits: benefitsTextToJson(benefits),
          stripePriceId: stripePriceId || null,
          highlight,
          isActive,
          order,
        },
      });
    });
  } catch (error) {
    console.error("[plans] update failed:", error);
    return {
      errors: { form: "Não foi possível salvar o plano. Tente novamente." },
      values: valuesFrom(formData),
    };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "plan.update",
    details: {
      planId,
      type: existing.type,
      name,
      priceCents,
      highlight,
      isActive,
      order,
    },
  });

  revalidatePath("/planos");
  revalidatePath(`/planos/${planId}`);

  return {
    errors: {},
    values: {
      name,
      tagline: tagline ?? "",
      priceCents: String(priceCents),
      benefits,
      stripePriceId: stripePriceId ?? "",
      order: String(order),
      highlight,
      isActive,
    },
  };
}
