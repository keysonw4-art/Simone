"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const LessonSchema = z.object({
  title: z.string().trim().min(2, "Título deve ter ao menos 2 caracteres").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  videoUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(500)
    .optional()
    .or(z.literal("")),
  isProtected: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
});

type FieldKey = "title" | "description" | "videoUrl" | "isProtected" | "form";
type LessonFieldErrors = Partial<Record<FieldKey, string>>;
type LessonValues = Partial<{
  title: string;
  description: string;
  videoUrl: string;
  isProtected: boolean;
}>;

export type LessonFormState =
  | { errors: LessonFieldErrors; values?: LessonValues }
  | undefined;

function flattenZod(error: z.ZodError): LessonFieldErrors {
  const out: LessonFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

function valuesFrom(formData: FormData): LessonValues {
  return {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    videoUrl: (formData.get("videoUrl") as string) ?? "",
    isProtected: formData.get("isProtected") === "on",
  };
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

async function loadModuleInCourse(courseId: string, moduleId: string) {
  return prisma.module.findFirst({
    where: { id: moduleId, courseId, deletedAt: null },
  });
}

async function loadLessonInModule(
  courseId: string,
  moduleId: string,
  lessonId: string,
) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, moduleId, deletedAt: null },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson || lesson.module.courseId !== courseId) return null;
  return lesson;
}

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const admin = await requireAdminOrRedirect();

  const mod = await loadModuleInCourse(courseId, moduleId);
  if (!mod) return { errors: { form: "Módulo não encontrado" } };

  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };

  const { title, description, videoUrl, isProtected } = parsed.data;

  const last = await prisma.lesson.findFirst({
    where: { moduleId, deletedAt: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  const created = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      description: description || null,
      videoUrl: videoUrl || null,
      isProtected,
      order,
    },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "lesson.create",
    details: { courseId, moduleId, lessonId: created.id, title },
  });

  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);
  redirect(`/cursos/${courseId}/modulos/${moduleId}`);
}

export async function updateLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const admin = await requireAdminOrRedirect();

  const existing = await loadLessonInModule(courseId, moduleId, lessonId);
  if (!existing) return { errors: { form: "Aula não encontrada" } };

  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };

  const { title, description, videoUrl, isProtected } = parsed.data;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title,
      description: description || null,
      videoUrl: videoUrl || null,
      isProtected,
    },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "lesson.update",
    details: { courseId, moduleId, lessonId, title },
  });

  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);
  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}/aulas/${lessonId}`);

  return {
    errors: {},
    values: { title, description, videoUrl, isProtected },
  };
}

export async function deleteLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const existing = await loadLessonInModule(courseId, moduleId, lessonId);
  if (!existing) return;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "lesson.delete",
    details: { courseId, moduleId, lessonId, title: existing.title },
  });

  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);
  redirect(`/cursos/${courseId}/modulos/${moduleId}`);
}

async function moveLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  direction: "up" | "down",
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const current = await loadLessonInModule(courseId, moduleId, lessonId);
  if (!current) return;

  const neighbor = await prisma.lesson.findFirst({
    where: {
      moduleId,
      deletedAt: null,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) return;

  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    }),
    prisma.lesson.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    }),
  ]);

  await logAuditEvent({
    userId: admin.id,
    action: "lesson.reorder",
    details: { courseId, moduleId, lessonId, direction, swappedWith: neighbor.id },
  });

  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);
}

export async function moveLessonUpAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<void> {
  await moveLesson(courseId, moduleId, lessonId, "up");
}

export async function moveLessonDownAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<void> {
  await moveLesson(courseId, moduleId, lessonId, "down");
}

export async function toggleLessonProtectedAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const existing = await loadLessonInModule(courseId, moduleId, lessonId);
  if (!existing) return;

  const next = !existing.isProtected;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isProtected: next },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "lesson.toggle_protected",
    details: { courseId, moduleId, lessonId, isProtected: next },
  });

  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);
}
