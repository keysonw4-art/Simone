import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@repo/database";
import { sendPurchaseConfirmationEmail } from "@repo/email";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Acesso avulso (compra de um módulo solto) tem janela fixa.
const AVULSO_ACCESS_MONTHS = 12;

/**
 * Checkout de pagamento único (modelo v2) concluído → cria a Purchase e
 * materializa os Entitlements. Idempotente pela unicidade da sessão Stripe.
 */
async function handlePaymentCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const md = session.metadata ?? {};
  const userId = md.userId;
  const kind = md.kind; // "product" | "course"

  if (!userId || !kind) {
    console.error("[stripe webhook] payment sem metadata userId/kind:", session.id);
    return;
  }

  const existing = await prisma.purchase.findUnique({
    where: { stripeCheckoutSessionId: session.id },
    select: { id: true },
  });
  if (existing) return; // já processado

  const amountCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const now = new Date();

  if (kind === "product") {
    const product = await prisma.product.findUnique({
      where: { id: md.productId },
      select: {
        id: true,
        name: true,
        accessMonths: true,
        grantsAll: true,
        maxSeats: true,
        productCourses: { select: { courseId: true } },
      },
    });
    if (!product) {
      console.error("[stripe webhook] product não encontrado:", md.productId);
      return;
    }
    const expiresAt = addMonths(now, product.accessMonths);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId,
          productId: product.id,
          amountCents,
          status: "PAID",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
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

      if (product.maxSeats != null) {
        // Incremento condicional: nunca ultrapassa maxSeats no contador.
        const inc = await tx.product.updateMany({
          where: { id: product.id, seatsSold: { lt: product.maxSeats } },
          data: { seatsSold: { increment: 1 } },
        });
        if (inc.count === 0) {
          // Vagas esgotaram entre o checkout e o webhook (race). O cliente já
          // pagou — honramos o acesso concedido acima, mas registramos pro
          // admin decidir (reembolsar / abrir vaga extra).
          console.error(
            "[stripe webhook] Founder oversell — vaga concedida além da quota:",
            { productId: product.id, userId },
          );
        }
      }
    });

    await sendPurchaseEmail(userId, product.name, amountCents, expiresAt);
  } else if (kind === "course") {
    const course = await prisma.course.findUnique({
      where: { id: md.courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      console.error("[stripe webhook] course avulso não encontrado:", md.courseId);
      return;
    }
    const expiresAt = addMonths(now, AVULSO_ACCESS_MONTHS);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId,
          courseId: course.id,
          amountCents,
          status: "PAID",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
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

    await sendPurchaseEmail(userId, course.title, amountCents, expiresAt);
  }
}

/**
 * Dispara a confirmação de compra por e-mail. Fail-safe: qualquer erro é
 * logado e engolido — nunca falha o webhook (que precisa responder 200 pra
 * o Stripe não reenviar).
 */
async function sendPurchaseEmail(
  userId: string,
  itemName: string,
  amountCents: number,
  expiresAt: Date,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;
    await sendPurchaseConfirmationEmail({
      to: user.email,
      name: user.name,
      itemName,
      amountCents,
      expiresAt,
    });
  } catch (err) {
    console.error("[stripe webhook] falha ao enviar e-mail de compra:", err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET ausente");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment") {
          // Compra única (único modelo comercial).
          await handlePaymentCheckout(session);
        }
        break;
      }

      default:
        // Ignora eventos não tratados (invoice.*, etc.) sem erro.
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] falha ao processar ${event.type}:`, err);
    // 500 faz o Stripe reenviar — bom pra falhas transitórias de DB.
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
