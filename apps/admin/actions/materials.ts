"use server";

import { randomUUID } from "node:crypto";
import { enforceRateLimit } from "@repo/auth/security";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
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
});

type FieldKey = "title" | "description" | "file" | "form";
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
  await enforceRateLimit("admin-material-upload", admin.id, 10, 600);

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!course) return { errors: { form: "Curso não encontrado" } };

  const parsed = MetaSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { errors: flatten(parsed.error) };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: "Selecione um arquivo." } };
  }

  if (file.size > 3 * 1024 * 1024) return { errors: { file: "O limite por arquivo é 3 MB." } };
  const filename = Array.from(file.name).map(char =>
    char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === "/" || char === "\\" ? "_" : char
  ).join("").slice(0, 180);
  const { title, description } = parsed.data;
  const materialId = randomUUID();
  const path = `courses/${courseId}/${materialId}`;
  let uploaded = false;
  try {
    // Storage I/O stays outside the DB transaction (no connection held during upload).
    await uploadFile({ bucket: BUCKETS.ArquivosAlunos, path, file, allowedMimes: ALLOWED_MATERIAL_MIMES });
    uploaded = true;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"materials:" + courseId}, 0))::text`;
      const last = await tx.material.findFirst({ where: { courseId, deletedAt: null }, orderBy: { order: "desc" }, select: { order: true } });
      await tx.material.create({ data: {
        id: materialId, courseId, title, description: description || null, filename, path,
        sizeBytes: file.size, mimeType: file.type || "application/octet-stream", order: (last?.order ?? 0) + 1,
      } });
      await logAuditEvent({ userId: admin.id, action: "material.upload",
        details: { materialId, courseId, filename, sizeBytes: file.size } }, tx);
    });
  } catch (error) {
    if (uploaded) {
      try { await deleteObject(BUCKETS.ArquivosAlunos, path); }
      catch { console.error("[materials] orphan cleanup required", { path }); }
    }
    if (error instanceof StorageValidationError || error instanceof StorageUploadError) {
      return { errors: { file: error.message } };
    }
    console.error("[materials] upload failed:", error);
    return { errors: { form: "Não foi possível salvar o material." } };
  }

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


  await prisma.$transaction(async tx => {
    await tx.material.update({
    where: { id: materialId },
    data: { deletedAt: new Date() },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "material.delete",
    details: { materialId, courseId, filename: material.filename },
  }, tx);
  });

  // Tenta apagar do bucket; se falhar, seguimos com soft delete DB (arquivo vira órfão)
  if (material.path) {
    try {
      await deleteObject(BUCKETS.ArquivosAlunos, material.path);
    } catch (error) {
      console.error("[materials] storage delete failed (orphan warning):", error);
    }
  }


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

  await prisma.$transaction(async tx => {
    await Promise.all([
    tx.material.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    }),
    tx.material.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    }),
    ]);
    await logAuditEvent({
    userId: admin.id,
    action: "material.reorder",
    details: { materialId, courseId, direction, swappedWith: neighbor.id },
  }, tx);
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
