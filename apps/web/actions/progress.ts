"use server";

import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { revalidatePath } from "next/cache";
import { issueCertificateIfEligible } from "../lib/certificates";

export async function toggleLessonProgress(lessonId: string, isCompleted: boolean) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  try {
    await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        lessonId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    });

    let certificateIssued: string | null = null;
    if (isCompleted) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { module: { select: { courseId: true } } },
      });
      if (lesson) {
        try {
          const cert = await issueCertificateIfEligible(
            session.user.id,
            lesson.module.courseId,
          );
          if (cert) certificateIssued = cert.publicCode;
        } catch (error) {
          console.error("[toggleLessonProgress] certificate issue failed:", error);
        }
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
