import { randomBytes } from "node:crypto";
import { prisma } from "@repo/database";
import { hasCourseEntitlement } from "./entitlements";

/**
 * Emite o certificado se o aluno completou 100% das aulas do curso.
 * Idempotente: se já existe certificado (userId, courseId), retorna o existente.
 * Retorna null se: sem entitlement ativo, curso sem aulas, curso não
 * encontrado, ou aluno incompleto.
 */
export async function issueCertificateIfEligible(
  userId: string,
  courseId: string,
) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  // Defesa em profundidade: só emite se o aluno tem/teve direito de acesso ao
  // curso. Sem isso, progresso forjado geraria certificado oficial de graça.
  const entitled = await hasCourseEntitlement(userId, courseId);
  if (!entitled) return null;

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
    select: { name: true },
  });
  if (!user) return null;

  const year = new Date().getFullYear();

  try {
    const cert = await prisma.$transaction(async (tx) => {
      // Contador segue só como métrica interna de emissões. O código PÚBLICO
      // leva um token aleatório — NÃO pode ser sequencial/enumerável, senão
      // dá pra iterar CERT-AAAA-NNNNN e colher nome+curso de toda a base.
      await tx.certificateCounter.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });
      const token = randomBytes(6).toString("hex").toUpperCase(); // 12 hex
      const publicCode = `CERT-${year}-${token}`;
      return tx.certificate.create({
        data: {
          publicCode,
          userId,
          courseId,
          // Nunca cai pra e-mail (vazaria PII na página pública de validação).
          studentName: user.name?.trim() || "Aluno",
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
