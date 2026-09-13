"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import type { PlanType } from "@repo/database";
import {
  BUCKETS,
  StorageUploadError,
  StorageValidationError,
  deleteObject,
  uploadFile,
} from "@repo/storage";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

// Whitelist de tipos aceitos como material de curso (PDF, imagens, office, zip).
const ALLOWED_MATERIAL_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

const MetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Título deve ter ao menos 2 caracteres")
    .max(120),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal("")),
  requiredPlan: z.enum(["BASIC", "INTERMEDIATE", "PREMIUM"], {
    errorMap: () => ({ message: "Plano inválido" }),
  }),
});

type FieldKey = "title" | "description" | "requiredPlan" | "file" | "form";
type FieldErrors = Partial<Record<FieldKey, string>>;

export type MaterialFormState = { errors: FieldErrors } | undefined;

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

function flatten(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as FieldKey | undefined;
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function uploadMaterialAction(
  courseId: string,
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  const admin = await requireAdminOrRedirect();

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!course) return { errors: { form: "Curso não encontrado" } };

  const parsed = MetaSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    requiredPlan: formData.get("requiredPlan") ?? "",
  });
  if (!parsed.success) return { errors: flatten(parsed.error) };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: "Selecione um arquivo." } };
  }

  const { title, description, requiredPlan } = parsed.data;

  // Determina o próximo order
  const last = await prisma.material.findFirst({
    where: { courseId, deletedAt: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  // Cria row primeiro pra ter o materialId no path
  const material = await prisma.material.create({
    data: {
      courseId,
      title,
      description: description || null,
      filename: file.name,
      path: "", // temporário
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      requiredPlan: requiredPlan as PlanType,
      order,
    },
  });

  const path = `courses/${courseId}/${material.id}`;

  try {
    await uploadFile({
      bucket: BUCKETS.ArquivosAlunos,
      path,
      file,
      allowedMimes: ALLOWED_MATERIAL_MIMES,
    });
  } catch (error) {
    // Rollback: remove a row se upload falhou
    await prisma.material.delete({ where: { id: material.id } });
    if (
      error instanceof StorageValidationError ||
      error instanceof StorageUploadError
    ) {
      return { errors: { file: error.message } };
    }
    console.error("[materials] upload failed:", error);
    return { errors: { form: "Falha inesperada ao processar o upload." } };
  }

  await prisma.material.update({
    where: { id: material.id },
    data: { path },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "material.upload",
    details: {
      materialId: material.id,
      courseId,
      slug: course.slug,
      filename: file.name,
      requiredPlan,
      sizeBytes: file.size,
    },
  });

  revalidatePath(`/cursos/${courseId}`);
  return { errors: {} };
}

export async function deleteMaterialAction(
  courseId: string,
  materialId: string,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const material = await prisma.material.findFirst({
    where: { id: materialId, courseId, deletedAt: null },
    select: { id: true, path: true, filename: true, courseId: true },
  });
  if (!material) return;

  // Tenta apagar do bucket; se falhar, seguimos com soft delete DB (arquivo vira órfão)
  if (material.path) {
    try {
      await deleteObject(BUCKETS.ArquivosAlunos, material.path);
    } catch (error) {
      console.error("[materials] storage delete failed (orphan warning):", error);
    }
  }

  await prisma.material.update({
    where: { id: materialId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "material.delete",
    details: { materialId, courseId, filename: material.filename },
  });

  revalidatePath(`/cursos/${courseId}`);
}

async function moveMaterial(
  courseId: string,
  materialId: string,
  direction: "up" | "down",
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const current = await prisma.material.findFirst({
    where: { id: materialId, courseId, deletedAt: null },
  });
  if (!current) return;

  const neighbor = await prisma.material.findFirst({
    where: {
      courseId,
      deletedAt: null,
      order:
        direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.material.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    }),
    prisma.material.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    }),
  ]);

  await logAuditEvent({
    userId: admin.id,
    action: "material.reorder",
    details: { materialId, courseId, direction, swappedWith: neighbor.id },
  });

  revalidatePath(`/cursos/${courseId}`);
}

export async function moveMaterialUpAction(
  courseId: string,
  materialId: string,
): Promise<void> {
  await moveMaterial(courseId, materialId, "up");
}

export async function moveMaterialDownAction(
  courseId: string,
  materialId: string,
): Promise<void> {
  await moveMaterial(courseId, materialId, "down");
}
