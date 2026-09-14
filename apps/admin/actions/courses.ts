"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";
import { randomSlugSuffix, slugify } from "../lib/slug";
import { reaisToCents } from "../lib/money";

const CourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Título deve ter ao menos 2 caracteres")
    .max(120, "Título deve ter no máximo 120 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug deve ter ao menos 2 caracteres")
    .max(120, "Slug deve ter no máximo 120 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hifens",
    ),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  thumbnail: z
    .string()
    .trim()
    .url("Thumbnail deve ser uma URL válida")
    .max(500)
    .optional()
    .or(z.literal("")),
  category: z
    .enum(["FORMACAO", "PRATICO", "TEORICO", "ESPECIALIZADO", "LINHA_DOMESTICA"])
    .optional()
    .or(z.literal("")),
  workloadHours: z
    .string()
    .trim()
    .regex(/^\d*$/, "Carga horária deve ser um número inteiro")
    .max(6)
    .optional()
    .or(z.literal("")),
  soldStandalone: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  standalonePriceCents: z
    .string()
    .trim()
    .regex(/^[\d.,\sR$]*$/, "Preço inválido")
    .max(20)
    .optional()
    .or(z.literal("")),
  standaloneStripePriceId: z
    .string()
    .trim()
    .max(255)
    .regex(/^price_[A-Za-z0-9]+$/, "Price ID deve começar com 'price_'")
    .optional()
    .or(z.literal("")),
});

type FieldKey =
  | "title"
  | "slug"
  | "description"
  | "thumbnail"
  | "category"
  | "workloadHours"
  | "standalonePriceCents"
  | "standaloneStripePriceId"
  | "form";
type CourseFieldErrors = Partial<Record<FieldKey, string>>;
type CourseValues = Partial<
  Record<
    | "title"
    | "slug"
    | "description"
    | "thumbnail"
    | "category"
    | "workloadHours"
    | "standalonePriceCents"
    | "standaloneStripePriceId",
    string
  > & { soldStandalone: boolean }
>;

export type CourseFormState =
  | { errors: CourseFieldErrors; values?: CourseValues }
  | undefined;

function flattenZod(error: z.ZodError): CourseFieldErrors {
  const out: CourseFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

function valuesFrom(formData: FormData): CourseValues {
  return {
    title: (formData.get("title") as string) ?? "",
    slug: (formData.get("slug") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    thumbnail: (formData.get("thumbnail") as string) ?? "",
    category: (formData.get("category") as string) ?? "",
    workloadHours: (formData.get("workloadHours") as string) ?? "",
    standalonePriceCents: (formData.get("standalonePriceCents") as string) ?? "",
    standaloneStripePriceId:
      (formData.get("standaloneStripePriceId") as string) ?? "",
    soldStandalone: formData.get("soldStandalone") === "on",
  };
}

// Converte os campos comerciais do form pro shape do Prisma.
function commercialData(d: {
  category?: string;
  workloadHours?: string;
  soldStandalone: boolean;
  standalonePriceCents?: string;
  standaloneStripePriceId?: string;
}) {
  return {
    category: d.category
      ? (d.category as
          | "FORMACAO"
          | "PRATICO"
          | "TEORICO"
          | "ESPECIALIZADO"
          | "LINHA_DOMESTICA")
      : null,
    workloadHours: d.workloadHours ? parseInt(d.workloadHours, 10) : null,
    soldStandalone: d.soldStandalone,
    standalonePriceCents: reaisToCents(d.standalonePriceCents ?? ""),
    standaloneStripePriceId: d.standaloneStripePriceId || null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}


async function saveCourse(id: string | null, formData: FormData): Promise<CourseFormState | { id: string }> {
  const admin = await requireAdminOrThrow();
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };
  const { title, slug, description, thumbnail, ...commercial } = parsed.data;
  const data = { title, slug, description: description || null, thumbnail: thumbnail || null, ...commercialData(commercial) };
  try {
    const saved = await prisma.$transaction(async tx => {
      const course = id
        ? await tx.course.update({ where: { id, deletedAt: null }, data })
        : await tx.course.create({ data: { ...data, modules: { create: { title: "", order: 0 } } } });
      await logAuditEvent({ userId: admin.id, action: id ? "course.update" : "course.create",
        details: { courseId: course.id, slug, title } }, tx);
      return course;
    });
    revalidatePath("/cursos");
    revalidatePath(`/cursos/${saved.id}`);
    return { id: saved.id };
  } catch (error) {
    console.error("[courses] save failed:", error);
    return { errors: isUniqueViolation(error) ? { slug: "Já existe um curso com esse slug" }
      : { form: "Não foi possível salvar o módulo." }, values: valuesFrom(formData) };
  }
}

export async function createCourseAction(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const result = await saveCourse(null, formData);
  if (result && "id" in result) redirect(`/cursos/${result.id}`);
  return result;
}

export async function updateCourseAction(id: string, _prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  if (!z.string().uuid().safeParse(id).success) return { errors: { form: "Módulo inválido." } };
  const result = await saveCourse(id, formData);
  return result && "id" in result ? { errors: {}, values: valuesFrom(formData) } : result;
}

export async function archiveCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();
  await prisma.$transaction(async tx => {
    const course = await tx.course.findFirst({ where: { id, deletedAt: null } });
    if (!course) return;
    await tx.course.update({ where: { id, isArchived: course.isArchived }, data: { isArchived: !course.isArchived } });
    await logAuditEvent({ userId: admin.id, action: course.isArchived ? "course.unarchive" : "course.archive", details: { courseId: id } }, tx);
  });
  revalidatePath("/cursos");
  revalidatePath(`/cursos/${id}`);
}

export async function deleteCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();
  await prisma.$transaction(async tx => {
    await tx.course.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAuditEvent({ userId: admin.id, action: "course.delete", details: { courseId: id } }, tx);
  });
  revalidatePath("/cursos");
  redirect("/cursos");
}

export async function duplicateCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();
  const source = await prisma.course.findFirst({ where: { id, deletedAt: null },
    select: { title: true, slug: true, description: true, thumbnail: true } });
  if (!source) return;
  const duplicate = await prisma.$transaction(async tx => {
    const created = await tx.course.create({ data: {
      title: `${source.title} (cópia)`.slice(0, 120),
      slug: `${slugify(source.slug).slice(0, 90)}-copia-${randomSlugSuffix()}`,
      description: source.description, thumbnail: source.thumbnail,
      modules: { create: { title: "", order: 0 } },
    } });
    await logAuditEvent({ userId: admin.id, action: "course.duplicate",
      details: { sourceCourseId: id, newCourseId: created.id, newSlug: created.slug } }, tx);
    return created;
  });
  revalidatePath("/cursos");
  redirect(`/cursos/${duplicate.id}`);
}

async function requireAdminOrThrow() {
  try { return await requireAdmin(); }
  catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}
