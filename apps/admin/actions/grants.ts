"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { IdSchema, enforceRateLimit } from "@repo/auth/security";
import { requireAdmin } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export async function grantAccessAction(userId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await enforceRateLimit("admin-grant", admin.id, 20, 60);
  const [kind, id, extra] = String(formData.get("target") ?? "").split(":");
  if (!IdSchema.safeParse(userId).success || !IdSchema.safeParse(id).success || extra || (kind !== "product" && kind !== "course")) return;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"checkout:" + kind + ":" + id}, 0))::text`;
    const target = await tx.user.findFirst({ where: { id: userId, deletedAt: null, blockedAt: null } });
    if (!target || target.role !== "STUDENT") return;
    const now = new Date();
    const existing = await tx.purchase.findFirst({ where: { userId, status: "PAID", accessSuspended: false,
      ...(kind === "product" ? { productId: id } : { courseId: id }),
      entitlements: { some: { expiresAt: { gt: now } } } } });
    if (existing) return; // Double clicks cannot create another active courtesy purchase.
    const product = kind === "product" ? await tx.product.findFirst({ where: { id, deletedAt: null, isActive: true },
      include: { productCourses: { include: { course: true } } } }) : null;
    const course = kind === "course" ? await tx.course.findFirst({ where: { id, deletedAt: null, isArchived: false } }) : null;
    if (!product && !course) return;
    const courseIds = product
      ? product.productCourses.filter(c => !c.course.deletedAt && !c.course.isArchived).map(c => c.courseId)
      : [course!.id];
    if (!product?.grantsAll && !courseIds.length) return;
    if (product?.maxSeats !== null && product?.maxSeats !== undefined) {
      const seats = await tx.purchase.count({ where: { productId: id,
        OR: [{ status: "PAID" }, { status: "PENDING", checkoutExpiresAt: { gt: now } }] } });
      if (seats >= product.maxSeats) throw new Error("Não há vagas disponíveis neste curso.");
    }
    const accessMonths = product?.accessMonths ?? 12;
    const expiresAt = addMonths(now, accessMonths);
    const purchase = await tx.purchase.create({ data: { userId, productId: product?.id, courseId: course?.id,
      amountCents: 0, status: "PAID", purchasedAt: now, expiresAt,
      snapshot: { version: 1, kind, id: id!, name: product?.name ?? course!.title, priceId: "price_manual",
        priceCents: 0, currency: "brl", accessMonths, grantsAll: product?.grantsAll ?? false,
        courseIds, certificateType: product ? product.certificateType : "DECLARATION" } } });
    await tx.entitlement.createMany({ data: product?.grantsAll
      ? [{ userId, scope: "ALL", expiresAt, purchaseId: purchase.id }]
      : courseIds.map(courseId => ({ userId, scope: "COURSE", courseId, expiresAt, purchaseId: purchase.id })) });
    if (product) await tx.product.update({ where: { id: product.id }, data: { seatsSold: { increment: 1 } } });
    await logAuditEvent({ userId: admin.id, action: "access.grant_" + kind,
      details: { userId, purchaseId: purchase.id, targetId: id } }, tx);
  });
  revalidatePath(`/alunos/${userId}`);
}

export async function revokeAccessAction(purchaseId: string, userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!IdSchema.safeParse(purchaseId).success || !IdSchema.safeParse(userId).success) return;
  await prisma.$transaction(async tx => {
    const order = await tx.purchase.findFirst({ where: { id: purchaseId, userId } });
    if (!order) return;
    await tx.purchase.update({ where: { id: purchaseId }, data: { accessSuspended: true } });
    await tx.entitlement.updateMany({ where: { purchaseId, userId }, data: { expiresAt: new Date() } });
    await logAuditEvent({ userId: admin.id, action: "access.revoke", details: { purchaseId, userId } }, tx);
  });
  revalidatePath(`/alunos/${userId}`);
}
