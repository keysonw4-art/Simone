"use server";

import { consumeRateLimit } from "@repo/auth/security";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import {
  BUCKETS,
  StorageUploadError,
  StorageValidationError,
  getPublicUrl,
  uploadImage,
} from "@repo/storage";
import { requireAdmin } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

export type ThumbnailUploadState =
  | { ok: true; url: string }
  | { ok: false; error: string }
  | undefined;

export async function uploadCourseThumbnailAction(
  courseId: string,
  _prev: ThumbnailUploadState,
  formData: FormData,
): Promise<ThumbnailUploadState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Acesso negado." };
  }

  if (!await consumeRateLimit("admin-image-upload", admin.id, 10, 600)) return { ok: false, error: "Aguarde antes de enviar outra imagem." };
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!course) return { ok: false, error: "Curso não encontrado." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo de imagem." };
  }

  const path = `courses/${course.id}.webp`;

  try {
    await uploadImage({ bucket: BUCKETS.ImagensPublicas, path, file });
  } catch (error) {
    if (
      error instanceof StorageValidationError ||
      error instanceof StorageUploadError
    ) {
      return { ok: false, error: error.message };
    }
    console.error("[uploads] unexpected:", error);
    return { ok: false, error: "Falha inesperada ao processar o upload." };
  }

  const url = getPublicUrl(BUCKETS.ImagensPublicas, path);

  await prisma.$transaction(async tx => {
    await tx.course.update({
    where: { id: courseId },
    data: { thumbnail: url },
  });
    await logAuditEvent({
    userId: admin.id,
    action: "course.thumbnail_upload",
    details: { courseId, slug: course.slug, path, size: file.size },
  }, tx);
  });

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${courseId}`);

  return { ok: true, url };
}
