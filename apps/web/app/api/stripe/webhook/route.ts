import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@repo/database";
import { sendPurchaseConfirmationEmail } from "@repo/email";
import { getStripe } from "@/lib/stripe";
import { PurchaseSnapshotSchema, addAccessMonths } from "@/lib/commerce";
import { deliverOnce } from "@/lib/emailDelivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fulfill(checkoutId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(checkoutId, { expand: ["line_items.data.price"] });
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  const paymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const purchaseId = session.metadata?.purchaseId;
  if (!purchaseId || !paymentId) {
    // Legacy checkouts cannot prove what the customer bought before this rollout.
    // Preserve the event for manual reconciliation instead of guessing a curriculum.
    await prisma.systemLog.create({ data: { event: "payment_review", origin: "stripe",
      description: JSON.stringify({ checkoutId, reason: "legacy_checkout_without_order" }) } });
    return;
  }
  const order = await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { user: true } });
  if (!order) throw new Error("Unknown purchase");
  const snapshot = PurchaseSnapshotSchema.parse(order.snapshot);
  const line = session.line_items?.data;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (order.userId !== session.metadata?.userId || customerId !== order.user.stripeCustomerId ||
      (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== session.id) ||
      session.currency !== snapshot.currency || session.amount_total !== snapshot.priceCents ||
      line?.length !== 1 || line[0]?.price?.id !== snapshot.priceId || line[0]?.quantity !== 1) {
    throw new Error("Checkout does not match the recorded order");
  }
  const intent = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
  if (intent.status !== "succeeded") return;
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const refunded = charge?.amount_refunded ?? 0;
  const suspended = Boolean(charge?.disputed);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"payment:" + paymentId}, 0))::text`;
    const current = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
    if (current.status !== "PENDING") return;
    const purchasedAt = new Date((charge?.created ?? session.created) * 1000);
    const expiresAt = addAccessMonths(purchasedAt, snapshot.accessMonths);
    let capacityExceeded = false;
    if (order.productId) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"checkout:product:" + order.productId}, 0))::text`;
      const product = await tx.product.findUniqueOrThrow({ where: { id: order.productId } });
      if (product.maxSeats !== null) {
        const sold = await tx.purchase.count({ where: { productId: order.productId, status: "PAID" } });
        capacityExceeded = sold >= product.maxSeats;
      }
    }
    await tx.purchase.update({ where: { id: purchaseId }, data: {
      status: refunded >= snapshot.priceCents ? "REFUNDED" : "PAID",
      stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentId, pendingKey: null,
      purchasedAt, expiresAt, accessSuspended: suspended || capacityExceeded, refundedCents: refunded,
    } });
    if (refunded < snapshot.priceCents && !capacityExceeded) {
      await tx.entitlement.createMany({ data: snapshot.grantsAll
        ? [{ userId: order.userId, scope: "ALL", purchaseId, expiresAt }]
        : snapshot.courseIds.map(courseId => ({ userId: order.userId, scope: "COURSE", courseId, purchaseId, expiresAt })) });
      if (order.productId) {
        await tx.product.update({ where: { id: order.productId }, data: { seatsSold: { increment: 1 } } });
      }
    }
    await tx.auditLog.create({ data: { userId: order.userId, action: "purchase.fulfilled",
      details: JSON.stringify({ purchaseId, checkoutId: session.id, refunded, suspended, capacityExceeded }) } });
  });
  const completed = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
  if (completed.status === "PAID" && !completed.accessSuspended && completed.expiresAt) {
    const key = "purchase-" + purchaseId;
    const delivered = await deliverOnce(key, () => sendPurchaseConfirmationEmail({ to: order.user.email,
      name: order.user.name, itemName: snapshot.name, amountCents: order.amountCents,
      expiresAt: completed.expiresAt!, idempotencyKey: key }));
    if (!delivered) throw new Error("Purchase confirmed; confirmation email pending retry");
  }
}

async function reconcilePayment(event: Stripe.Event) {
  const stripe = getStripe();
  let charge: Stripe.Charge;
  let disputeSuspended: boolean | undefined;
  if (event.type.startsWith("charge.dispute.")) {
    const dispute = await stripe.disputes.retrieve((event.data.object as Stripe.Dispute).id);
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
    charge = await stripe.charges.retrieve(chargeId);
    disputeSuspended = !["won", "warning_closed"].includes(dispute.status);
  } else {
    charge = await stripe.charges.retrieve((event.data.object as Stripe.Charge).id);
  }
  const paymentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentId) return;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"payment:" + paymentId}, 0))::text`;
    const order = await tx.purchase.findUnique({ where: { stripePaymentIntentId: paymentId } });
    if (!order) return; // Fulfillment consults the latest charge before granting access.
    const fullyRefunded = charge.refunded || charge.amount_refunded >= order.amountCents;
    if (order.paymentEventAt > BigInt(event.created) && !fullyRefunded) return;
    await tx.purchase.update({ where: { id: order.id }, data: {
      refundedCents: charge.amount_refunded, paymentEventAt: BigInt(event.created),
      ...(fullyRefunded ? { status: "REFUNDED" as const, accessSuspended: true } :
        disputeSuspended !== undefined && order.status === "PAID" ? { accessSuspended: disputeSuspended } : {}),
    } });
    await tx.auditLog.create({ data: { userId: order.userId, action: "purchase.reconciled",
      details: JSON.stringify({ purchaseId: order.id, eventId: event.id, eventType: event.type, fullyRefunded }) } });
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no_signature" }, { status: 400 });
  if (Number(req.headers.get("content-length")) > 1_048_576) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody) > 1_048_576) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(rawBody, signature, secret); }
  catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfill((event.data.object as Stripe.Checkout.Session).id);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await prisma.purchase.updateMany({ where: {
          stripeCheckoutSessionId: (event.data.object as Stripe.Checkout.Session).id, status: "PENDING",
        }, data: { pendingKey: null, checkoutExpiresAt: new Date() } });
        break;
      case "charge.refunded":
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
        await reconcilePayment(event);
        break;
    }
  } catch (error) {
    console.error("[stripe webhook] processing failed", { eventId: event.id, type: event.type,
      error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
