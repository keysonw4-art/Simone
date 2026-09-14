import { randomBytes } from "node:crypto";
import { prisma, type Certificate, type CertificateType } from "@repo/database";
import { PurchaseSnapshotSchema } from "./commerce";

/** The entitlement, paid order and complete curriculum are checked at issuance. */
export async function issueCertificateIfEligible(userId: string, courseId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"certificate:" + userId}, 0))::text`;
    const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null, blockedAt: null } });
    if (!user) return null;
    const purchases = await tx.purchase.findMany({
      where: { userId, status: "PAID", accessSuspended: false,
        entitlements: { some: { expiresAt: { gt: new Date() }, OR: [{ scope: "ALL" }, { courseId }] } } },
      include: { product: { include: { productCourses: true } }, course: true, entitlements: true },
    });
    let issued: Certificate | null = null;
    for (const purchase of purchases) {
      const parsed = PurchaseSnapshotSchema.safeParse(purchase.snapshot);
      const snapshot = parsed.success ? parsed.data : null;
      // Legacy/manual purchases use the administrator's configured curriculum.
      const ids = purchase.productId
        ? snapshot?.courseIds ?? purchase.product?.productCourses.map(c => c.courseId) ?? []
        : purchase.courseId ? [purchase.courseId] : [];
      const type: CertificateType | null = purchase.productId
        ? (snapshot ? snapshot.certificateType : purchase.product?.certificateType ?? null)
        : "DECLARATION";
      if (!type || !ids.length || !ids.includes(courseId)) continue;
      if (!ids.every(id => purchase.entitlements.some(e => e.expiresAt > new Date() && (e.scope === "ALL" || e.courseId === id)))) continue;
      const existing = await tx.certificate.findFirst({ where: { userId,
        ...(purchase.productId ? { productId: purchase.productId } : { courseId, productId: null }) } });
      if (existing) { issued = existing; continue; }
      const courses = await tx.course.findMany({ where: { id: { in: ids }, deletedAt: null, isArchived: false },
        select: { id: true, modules: { where: { deletedAt: null }, select: {
          lessons: { where: { deletedAt: null }, select: { id: true } } } } } });
      if (courses.length !== ids.length) continue;
      const groups = courses.map(c => c.modules.flatMap(m => m.lessons.map(l => l.id)));
      if (groups.some(lessons => !lessons.length)) continue;
      const lessonIds = groups.flat();
      const completed = await tx.progress.count({ where: { userId, lessonId: { in: lessonIds }, isCompleted: true } });
      if (completed !== lessonIds.length) continue;
      const year = new Date().getFullYear();
      await tx.certificateCounter.upsert({ where: { year }, update: { lastNumber: { increment: 1 } }, create: { year, lastNumber: 1 } });
      issued = await tx.certificate.create({ data: {
        userId, courseId: purchase.productId ? null : courseId, productId: purchase.productId, type,
        publicCode: `CERT-${year}-${randomBytes(16).toString("hex").toUpperCase()}`,
        studentName: user.name?.trim() || "Aluno",
        courseTitle: snapshot?.name ?? purchase.product?.name ?? purchase.course?.title ?? "Curso",
      } });
      await tx.auditLog.create({ data: { userId, action: "certificate.issue",
        details: JSON.stringify({ certificateId: issued.id, purchaseId: purchase.id, type, courseIds: ids }) } });
    }
    return issued;
  }, { timeout: 15_000 });
}
