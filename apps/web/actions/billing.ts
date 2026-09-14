"use server";

import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { appUrl } from "@repo/email";
import { IdSchema, consumeRateLimit } from "@repo/auth/security";
import { getStripe } from "@/lib/stripe";
import { requireSession } from "@/lib/subscriptionGuard";
import { getUserAccess } from "@/lib/entitlements";
import { PurchaseSnapshotSchema, type PurchaseSnapshot } from "@/lib/commerce";

async function startCheckout(kind: "product" | "course", id: string) {
  const user = await requireSession();
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/aluno");
  const catalog = kind === "product" ? "/planos" : "/avulsos";
  if (!IdSchema.safeParse(id).success) redirect(catalog + "?erro=indisponivel");
  if (!await consumeRateLimit("checkout", user.id, 10, 600)) redirect(catalog + "?erro=limite");
  const stripe = getStripe();
  const snapshot = await loadOffer(kind, id);
  if (!snapshot) redirect(catalog + "?erro=indisponivel");
  const access = await getUserAccess(user.id);
  if (access.grantsAll || (!snapshot.grantsAll && snapshot.courseIds.every(c => access.courseIds.has(c)))) redirect("/aluno/cursos?ja=possui");

  // The public price and Stripe Price must describe the same one-time purchase.
  const price = await stripe.prices.retrieve(snapshot.priceId);
  if (!price.active || price.type !== "one_time" || price.currency !== snapshot.currency || price.unit_amount !== snapshot.priceCents) {
    console.error("[checkout] price mismatch", { kind, id });
    redirect(catalog + "?erro=preco");
  }

  const pendingKey = user.id + ":" + kind + ":" + id;
  const purchase = await prisma.$transaction(async tx => {
    // Transaction-scoped lock works with the Supabase transaction pooler.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"checkout:" + kind + ":" + id}, 0))::text`;
    const now = new Date();
    await tx.purchase.updateMany({
      where: { pendingKey, status: "PENDING", checkoutExpiresAt: { lte: now } },
      data: { pendingKey: null },
    });
    const existing = await tx.purchase.findUnique({ where: { pendingKey } });
    if (existing) return existing;
    if (kind === "product") {
      const current = await tx.product.findFirst({ where: { id, deletedAt: null, isActive: true } });
      if (!current) return null;
      if (current.maxSeats !== null) {
        const reserved = await tx.purchase.count({ where: { productId: id,
          OR: [{ status: "PAID" }, { status: "PENDING", checkoutExpiresAt: { gt: now } }] } });
        if (reserved >= current.maxSeats) return null;
      }
    }
    return tx.purchase.create({ data: {
      userId: user.id, productId: kind === "product" ? id : null, courseId: kind === "course" ? id : null,
      amountCents: snapshot.priceCents, pendingKey, snapshot,
      checkoutExpiresAt: new Date(Date.now() + 31 * 60_000),
    } });
  });
  if (!purchase) redirect(catalog + "?erro=esgotado");
  if (purchase.status !== "PENDING") redirect("/aluno/cursos?ja=possui");
  if (purchase.checkoutUrl) redirect(purchase.checkoutUrl);
  const offer = PurchaseSnapshotSchema.parse(purchase.snapshot);
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  let customerId = account.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: account.email, metadata: { userId: user.id } },
      { idempotencyKey: "customer-v1-" + user.id });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }
  const metadata = { userId: user.id, purchaseId: purchase.id, kind, [kind === "product" ? "productId" : "courseId"]: id };
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment", customer: customerId, client_reference_id: purchase.id,
    line_items: [{ price: offer.priceId, quantity: 1 }], locale: "pt-BR",
    payment_method_types: ["card"],
    payment_method_options: { card: { installments: { enabled: true } } },
    metadata, payment_intent_data: { metadata },
    expires_at: Math.floor(purchase.checkoutExpiresAt!.getTime() / 1000) - 30,
    success_url: appUrl() + "/aluno/cursos?compra=sucesso",
    cancel_url: appUrl() + catalog + "?checkout=cancelado",
  }, { idempotencyKey: "checkout-v1-" + purchase.id });
  if (!checkout.url) redirect(catalog + "?erro=checkout");
  await prisma.purchase.update({ where: { id: purchase.id }, data: {
    stripeCheckoutSessionId: checkout.id, checkoutUrl: checkout.url,
  } });
  redirect(checkout.url);
}

async function loadOffer(kind: "product" | "course", id: string): Promise<PurchaseSnapshot | null> {
  if (kind === "course") {
    const c = await prisma.course.findFirst({ where: { id, deletedAt: null, isArchived: false, soldStandalone: true } });
    if (!c?.standaloneStripePriceId || !c.standalonePriceCents) return null;
    return PurchaseSnapshotSchema.parse({ version: 1, kind, id, name: c.title, priceId: c.standaloneStripePriceId,
      priceCents: c.standalonePriceCents, currency: "brl", accessMonths: 12, grantsAll: false,
      courseIds: [id], certificateType: "DECLARATION" });
  }
  const p = await prisma.product.findFirst({ where: { id, deletedAt: null, isActive: true },
    include: { productCourses: { include: { course: true } } } });
  if (!p?.stripePriceId || !p.priceCents) return null;
  const courseIds = p.productCourses.filter(c => !c.course.deletedAt && !c.course.isArchived).map(c => c.courseId);
  // ALL access does not imply that every future module belongs to the certificate curriculum.
  if (!p.grantsAll && !courseIds.length) return null;
  return PurchaseSnapshotSchema.parse({ version: 1, kind, id, name: p.name, priceId: p.stripePriceId,
    priceCents: p.priceCents, currency: "brl", accessMonths: p.accessMonths, grantsAll: p.grantsAll,
    courseIds, certificateType: p.certificateType });
}

export async function startProductCheckoutAction(productId: string): Promise<void> { await startCheckout("product", productId); }
export async function startModuleCheckoutAction(courseId: string): Promise<void> { await startCheckout("course", courseId); }
