"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const AVULSO_ACCESS_MONTHS = 12;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

/**
 * Concede acesso manualmente (founder/cortesia, sem Stripe). O `target` vem do
 * form como "product:<id>" ou "course:<id>". Cria uma Purchase (valor 0) e
 * materializa os Entitlements — mesma regra do webhook.
 */
export async function grantAccessAction(
  userId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  const target = String(formData.get("target") ?? "");
  const [kind, id] = target.split(":");
  if (!kind || !id) {
    revalidatePath(`/alunos/${userId}`);
    return;
  }

  const now = new Date();

  if (kind === "product") {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        accessMonths: true,
        grantsAll: true,
        productCourses: { select: { courseId: true } },
      },
    });
    if (!product) return;
    const expiresAt = addMonths(now, product.accessMonths);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId,
          productId: product.id,
          amountCents: 0,
          status: "PAID",
          purchasedAt: now,
          expiresAt,
        },
      });
      if (product.grantsAll) {
        await tx.entitlement.create({
          data: { userId, scope: "ALL", expiresAt, purchaseId: purchase.id },
        });
      } else if (product.productCourses.length > 0) {
        await tx.entitlement.createMany({
          data: product.productCourses.map((pc) => ({
            userId,
            scope: "COURSE" as const,
            courseId: pc.courseId,
            expiresAt,
            purchaseId: purchase.id,
          })),
        });
      }
    });

    await logAuditEvent({
      userId: admin.id,
      action: "access.grant_product",
      details: { userId, productId: product.id },
    });
  } else if (kind === "course") {
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!course) return;
    const expiresAt = addMonths(now, AVULSO_ACCESS_MONTHS);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId,
          courseId: course.id,
          amountCents: 0,
          status: "PAID",
          purchasedAt: now,
          expiresAt,
        },
      });
      await tx.entitlement.create({
        data: {
          userId,
          scope: "COURSE",
          courseId: course.id,
          expiresAt,
          purchaseId: purchase.id,
        },
      });
    });

    await logAuditEvent({
      userId: admin.id,
      action: "access.grant_module",
      details: { userId, courseId: course.id },
    });
  }

  revalidatePath(`/alunos/${userId}`);
}

/**
 * Revoga um acesso: expira os entitlements da compra (não-destrutivo, mantém
 * o histórico da Purchase).
 */
export async function revokeAccessAction(
  purchaseId: string,
  userId: string,
): Promise<void> {
  const admin = await requireAdminOrRedirect();

  await prisma.entitlement.updateMany({
    where: { purchaseId },
    data: { expiresAt: new Date() },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "access.revoke",
    details: { purchaseId, userId },
  });

  revalidatePath(`/alunos/${userId}`);
}
