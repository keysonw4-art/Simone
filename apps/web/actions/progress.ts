"use server";

import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { revalidatePath } from "next/cache";
import { issueCertificateIfEligible } from "../lib/certificates";
import { hasCourseEntitlement } from "../lib/entitlements";
import { IdSchema, consumeRateLimit } from '@repo/auth/security';

export async function toggleLessonProgress(lessonId: string, isCompleted: boolean) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;
  if (!IdSchema.safeParse(lessonId).success || typeof isCompleted !== 'boolean') return { success: false, error: 'Dados inválidos' };
  if (!await consumeRateLimit('progress', userId, 60, 60)) return { success: false, error: 'Aguarde antes de atualizar novamente.' };
  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  // Carrega a aula pra saber o curso e se é protegida ANTES de gravar nada.
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, module: { deletedAt: null, course: { deletedAt: null, isArchived: false } } },
    select: { id: true, isProtected: true, module: { select: { courseId: true } } },
  });
  if (!lesson) {
    return { success: false, error: "Aula não encontrada" };
  }

  // Gate: aula protegida exige entitlement ativo que cubra o módulo (ou staff).
  // Sem isso, qualquer conta marcava progresso de qualquer aula e emitia
  // certificado oficial de graça (IDOR de certificado / bypass de paywall).
  const courseId = lesson.module.courseId;
  if (lesson.isProtected && !isStaff) {
    const allowed = await hasCourseEntitlement(userId, courseId);
    if (!allowed) {
      await prisma.systemLog
        .create({
          data: {
            userId,
            event: "access_denied",
            origin: "lesson_progress",
            description: JSON.stringify({ lessonId, reason: "no_entitlement" }),
          },
        })
        .catch(() => {});
      return { success: false, error: "Sem acesso a este curso" };
    }
  }

  try {
    await prisma.progress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    });

    let certificateIssued: string | null = null;
    if (isCompleted) {
      try {
        const cert = await issueCertificateIfEligible(userId, courseId);
        if (cert) certificateIssued = cert.publicCode;
      } catch (error) {
        console.error("[toggleLessonProgress] certificate issue failed:", error);
      }
    }

    revalidatePath(`/aluno/cursos`, "layout");
    if (certificateIssued) revalidatePath("/aluno/certificados");
    return { success: true, certificateIssued };
  } catch (error) {
    console.error("[toggleLessonProgress]", error);
    return { success: false, error: "Falha ao salvar progresso" };
  }
}
