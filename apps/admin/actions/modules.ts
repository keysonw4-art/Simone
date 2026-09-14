"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const ModuleSchema = z.object({
  title: z.string().trim().min(2, "Título deve ter ao menos 2 caracteres").max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
});

type FieldKey = "title" | "description" | "form";
type ModuleFieldErrors = Partial<Record<FieldKey, string>>;
type ModuleValues = Partial<Record<"title" | "description", string>>;

export type ModuleFormState =
  | { errors: ModuleFieldErrors; values?: ModuleValues }
  | undefined;

function flattenZod(error: z.ZodError): ModuleFieldErrors {
  const out: ModuleFieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

function valuesFrom(formData: FormData): ModuleValues {
  return {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
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

export async function createModuleAction(
  courseId: string,
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const admin = await requireAdminOrRedirect();

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true },
  });
  if (!course) return { errors: { form: "Curso não encontrado" } };

  const parsed = ModuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };

  const { title, description } = parsed.data;

  const last = await prisma.module.findFirst({
    where: { courseId, deletedAt: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  const created = await prisma.$transaction(async tx => {
    const created = await tx.module.create({
    data: { courseId, title, description: description || null, order },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "module.create",
    details: { courseId, moduleId: created.id, title },
  }, tx);
    return created;
  });

  revalidatePath(`/cursos/${courseId}`);
  redirect(`/cursos/${courseId}/modulos/${created.id}`);
}

export async function updateModuleAction(
  courseId: string,
  moduleId: string,
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const admin = await requireAdminOrRedirect();

  const existing = await loadModuleInCourse(courseId, moduleId);
  if (!existing) return { errors: { form: "Módulo não encontrado" } };

  const parsed = ModuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { errors: flattenZod(parsed.error), values: valuesFrom(formData) };

  const { title, description } = parsed.data;

  await prisma.$transaction(async tx => {
    await tx.module.update({
    where: { id: moduleId },
    data: { title, description: description || null },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "module.update",
    details: { courseId, moduleId, title },
  }, tx);
  });

  revalidatePath(`/cursos/${courseId}`);
  revalidatePath(`/cursos/${courseId}/modulos/${moduleId}`);

  return { errors: {}, values: { title, description } };
}

export async function deleteModuleAction(
  courseId: string,
  moduleId: string,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const existing = await loadModuleInCourse(courseId, moduleId);
  if (!existing) return;

  await prisma.$transaction(async tx => {
    await tx.module.update({
    where: { id: moduleId },
    data: { deletedAt: new Date() },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "module.delete",
    details: { courseId, moduleId, title: existing.title },
  }, tx);
  });

  revalidatePath(`/cursos/${courseId}`);
  redirect(`/cursos/${courseId}`);
}

async function moveModule(
  courseId: string,
  moduleId: string,
  direction: "up" | "down",
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const current = await loadModuleInCourse(courseId, moduleId);
  if (!current) return;

  const neighbor = await prisma.module.findFirst({
    where: {
      courseId,
      deletedAt: null,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) return;

  await prisma.$transaction(async tx => {
    await Promise.all([
    tx.module.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    }),
    tx.module.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    }),
    ]);
    await logAuditEvent({
    userId: admin.id,
    action: "module.reorder",
    details: {
      courseId,
      moduleId,
      direction,
      swappedWith: neighbor.id,
    },
  }, tx);
  });

  revalidatePath(`/cursos/${courseId}`);
}

export async function moveModuleUpAction(
  courseId: string,
  moduleId: string,
): Promise<void> {
  await moveModule(courseId, moduleId, "up");
}

export async function moveModuleDownAction(
  courseId: string,
  moduleId: string,
): Promise<void> {
  await moveModule(courseId, moduleId, "down");
}
