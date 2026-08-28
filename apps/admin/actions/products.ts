"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const ProductSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug: apenas minúsculas, números e hifens"),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceCents: z
    .string()
    .trim()
    .regex(/^\d+$/, "Preço em centavos (inteiro)")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0).max(99999999)),
  accessMonths: z
    .string()
    .trim()
    .regex(/^\d+$/, "Meses de acesso (inteiro)")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(120)),
  grantsAll: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  certificateType: z
    .enum(["DECLARATION", "PROFESSIONAL"])
    .optional()
    .or(z.literal("")),
  includesMentoring: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  maxSeats: z
    .string()
    .trim()
    .regex(/^\d*$/, "Vagas: inteiro ou vazio")
    .max(7)
    .optional()
    .or(z.literal("")),
  highlight: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  isActive: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  order: z
    .string()
    .trim()
    .regex(/^\d+$/, "Ordem (inteiro)")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0).max(999)),
  stripePriceId: z
    .string()
    .trim()
    .max(255)
    .regex(/^price_[A-Za-z0-9]+$/, "Price ID deve começar com 'price_'")
    .optional()
    .or(z.literal("")),
});

type FieldKey =
  | "name"
  | "slug"
  | "tagline"
  | "description"
  | "priceCents"
  | "accessMonths"
  | "certificateType"
  | "maxSeats"
  | "order"
  | "stripePriceId"
  | "form";
type ProductFieldErrors = Partial<Record<FieldKey, string>>;

export type ProductFormState = { errors: ProductFieldErrors } | undefined;

function flattenZod(error: z.ZodError): ProductFieldErrors {
  const out: ProductFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

function dataFrom(d: z.infer<typeof ProductSchema>) {
  return {
    name: d.name,
    slug: d.slug,
    tagline: d.tagline || null,
    description: d.description || null,
    priceCents: d.priceCents,
    accessMonths: d.accessMonths,
    grantsAll: d.grantsAll,
    certificateType: d.certificateType
      ? (d.certificateType as "DECLARATION" | "PROFESSIONAL")
      : null,
    includesMentoring: d.includesMentoring,
    maxSeats: d.maxSeats ? parseInt(d.maxSeats, 10) : null,
    highlight: d.highlight,
    isActive: d.isActive,
    order: d.order,
    stripePriceId: d.stripePriceId || null,
  };
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdminOrRedirect();

  const parsed = ProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: flattenZod(parsed.error) };

  let created;
  try {
    created = await prisma.product.create({ data: dataFrom(parsed.data) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { errors: { slug: "Já existe um curso com esse slug" } };
    }
    console.error("[products] create failed:", error);
    return { errors: { form: "Não foi possível criar o curso." } };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "product.create",
    details: { productId: created.id, slug: created.slug },
  });

  revalidatePath("/produtos");
  redirect(`/produtos/${created.id}`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdminOrRedirect();

  const parsed = ProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: flattenZod(parsed.error) };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.highlight) {
        await tx.product.updateMany({
          where: { id: { not: id }, deletedAt: null },
          data: { highlight: false },
        });
      }
      await tx.product.update({ where: { id }, data: dataFrom(parsed.data) });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { errors: { slug: "Já existe um curso com esse slug" } };
    }
    console.error("[products] update failed:", error);
    return { errors: { form: "Não foi possível salvar o curso." } };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "product.update",
    details: { productId: id, slug: parsed.data.slug },
  });

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id}`);
  return { errors: {} };
}

export async function deleteProductAction(id: string): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const current = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!current) return;

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "product.delete",
    details: { productId: id, slug: current.slug },
  });

  revalidatePath("/produtos");
  redirect("/produtos");
}

/**
 * Substitui a composição de módulos de um curso pelo conjunto enviado.
 * Ignorado quando o curso concede tudo (grantsAll).
 */
export async function setProductCoursesAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const courseIds = formData.getAll("courseIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  await prisma.$transaction(async (tx) => {
    await tx.productCourse.deleteMany({ where: { productId } });
    if (courseIds.length > 0) {
      await tx.productCourse.createMany({
        data: courseIds.map((courseId, i) => ({ productId, courseId, order: i })),
        skipDuplicates: true,
      });
    }
  });

  await logAuditEvent({
    userId: admin.id,
    action: "product.set_courses",
    details: { productId, count: courseIds.length },
  });

  revalidatePath(`/produtos/${productId}`);
}
