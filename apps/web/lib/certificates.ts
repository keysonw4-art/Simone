import { prisma } from "@repo/database";

/**
 * Emite o certificado se o aluno completou 100% das aulas do curso.
 * Idempotente: se já existe certificado (userId, courseId), retorna o existente.
 * Retorna null se: curso sem aulas, curso não encontrado, ou aluno incompleto.
 */
export async function issueCertificateIfEligible(
  userId: string,
  courseId: string,
) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      modules: {
        where: { deletedAt: null },
        select: {
          lessons: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!course) return null;

  const allLessonIds = course.modules.flatMap((m) =>
    m.lessons.map((l) => l.id),
  );
  if (allLessonIds.length === 0) return null;

  const completed = await prisma.progress.count({
    where: {
      userId,
      lessonId: { in: allLessonIds },
      isCompleted: true,
    },
  });
  if (completed < allLessonIds.length) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return null;

  const year = new Date().getFullYear();

  try {
    const cert = await prisma.$transaction(async (tx) => {
      const counter = await tx.certificateCounter.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });
      const publicCode = `CERT-${year}-${String(counter.lastNumber).padStart(5, "0")}`;
      return tx.certificate.create({
        data: {
          publicCode,
          userId,
          courseId,
          studentName: user.name?.trim() || user.email || "Aluno",
          courseTitle: course.title,
        },
      });
    });
    return cert;
  } catch (error) {
    // Race: outro request emitiu no meio-tempo. Retorna o existente.
    const found = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (found) return found;
    throw error;
  }
}
