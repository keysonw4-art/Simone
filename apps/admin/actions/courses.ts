"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";
import { randomSlugSuffix, slugify } from "../lib/slug";

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
    .regex(/^\d*$/, "Preço deve ser um número inteiro em centavos")
    .max(9)
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
    | "standalonePriceCents",
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
    soldStandalone: formData.get("soldStandalone") === "on",
  };
}

// Converte os campos comerciais do form pro shape do Prisma.
function commercialData(d: {
  category?: string;
  workloadHours?: string;
  soldStandalone: boolean;
  standalonePriceCents?: string;
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
    standalonePriceCents: d.standalonePriceCents
      ? parseInt(d.standalonePriceCents, 10)
      : null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createCourseAction(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { errors: { form: "Acesso negado." } };
  }

  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };
  }

  const { title, slug, description, thumbnail, ...commercial } = parsed.data;

  let created;
  try {
    created = await prisma.course.create({
      data: {
        title,
        slug,
        description: description || null,
        thumbnail: thumbnail || null,
        ...commercialData(commercial),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        errors: { slug: "Já existe um curso com esse slug" },
        values: valuesFrom(formData),
      };
    }
    console.error("[courses] create failed:", error);
    return {
      errors: { form: "Não foi possível criar o curso. Tente novamente." },
      values: valuesFrom(formData),
    };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "course.create",
    details: { courseId: created.id, slug: created.slug, title: created.title },
  });

  revalidatePath("/cursos");
  redirect(`/cursos/${created.id}`);
}

export async function updateCourseAction(
  id: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { errors: { form: "Acesso negado." } };
  }

  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };
  }

  const { title, slug, description, thumbnail, ...commercial } = parsed.data;

  try {
    await prisma.course.update({
      where: { id },
      data: {
        title,
        slug,
        description: description || null,
        thumbnail: thumbnail || null,
        ...commercialData(commercial),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        errors: { slug: "Já existe um curso com esse slug" },
        values: valuesFrom(formData),
      };
    }
    console.error("[courses] update failed:", error);
    return {
      errors: { form: "Não foi possível salvar as alterações." },
      values: valuesFrom(formData),
    };
  }

  await logAuditEvent({
    userId: admin.id,
    action: "course.update",
    details: { courseId: id, slug, title },
  });

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${id}`);

  return { errors: {}, values: valuesFrom(formData) };
}

export async function archiveCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();

  const current = await prisma.course.findUnique({
    where: { id },
    select: { isArchived: true, slug: true },
  });
  if (!current) return;

  const nextValue = !current.isArchived;

  await prisma.course.update({
    where: { id },
    data: { isArchived: nextValue },
  });

  await logAuditEvent({
    userId: admin.id,
    action: nextValue ? "course.archive" : "course.unarchive",
    details: { courseId: id, slug: current.slug },
  });

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${id}`);
}

export async function deleteCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();

  const current = await prisma.course.findUnique({
    where: { id },
    select: { slug: true, title: true },
  });
  if (!current) return;

  await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "course.delete",
    details: { courseId: id, slug: current.slug, title: current.title },
  });

  revalidatePath("/cursos");
  redirect("/cursos");
}

export async function duplicateCourseAction(id: string): Promise<void> {
  const admin = await requireAdminOrThrow();

  const source = await prisma.course.findUnique({
    where: { id },
    select: { title: true, slug: true, description: true, thumbnail: true },
  });
  if (!source) return;

  const baseTitle = `${source.title} (cópia)`;
  const baseSlug = `${slugify(source.slug)}-copia-${randomSlugSuffix()}`;

  let duplicate;
  try {
    duplicate = await prisma.course.create({
      data: {
        title: baseTitle,
        slug: baseSlug,
        description: source.description,
        thumbnail: source.thumbnail,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      duplicate = await prisma.course.create({
        data: {
          title: baseTitle,
          slug: `${baseSlug}-${randomSlugSuffix()}`,
          description: source.description,
          thumbnail: source.thumbnail,
        },
      });
    } else {
      throw error;
    }
  }

  await logAuditEvent({
    userId: admin.id,
    action: "course.duplicate",
    details: {
      sourceCourseId: id,
      newCourseId: duplicate.id,
      newSlug: duplicate.slug,
    },
  });

  revalidatePath("/cursos");
  redirect(`/cursos/${duplicate.id}`);
}

async function requireAdminOrThrow() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
}
