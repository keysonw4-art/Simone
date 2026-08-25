import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@repo/database";
import type { PlanType } from "@repo/database";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/** Lê o fim do período pago, resiliente a mudanças de local do campo na API. */
function readPeriodEnd(sub: Stripe.Subscription): Date | null {
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const raw = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  return typeof raw === "number" ? new Date(raw * 1000) : null;
}

/** status do Stripe que concedem acesso. */
function isActiveStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Descobre o PlanType a partir dos metadados ou casando o Price ID com um Plan.
 */
async function resolvePlanType(
  sub: Stripe.Subscription,
): Promise<PlanType | null> {
  const fromMeta = sub.metadata?.planType as PlanType | undefined;
  if (fromMeta === "BASIC" || fromMeta === "INTERMEDIATE" || fromMeta === "PREMIUM") {
    return fromMeta;
  }
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (priceId) {
    const plan = await prisma.plan.findFirst({
      where: { stripePriceId: priceId },
      select: { type: true },
    });
    if (plan) return plan.type;
  }
  return null;
}

/** Descobre o userId por metadado ou pelo stripeCustomerId. */
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (fromMeta) return fromMeta;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Sincroniza (upsert) o estado da assinatura do Stripe no nosso banco.
 * Idempotente: mesma sub reprocessada só re-escreve os mesmos dados.
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(sub);
  const planType = await resolvePlanType(sub);

  if (!userId || !planType) {
    console.error("[stripe webhook] sub sem userId/planType:", {
      sub: sub.id,
      userId,
      planType,
    });
    return;
  }

  const active = isActiveStatus(sub.status);
  const periodEnd = readPeriodEnd(sub);

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      planType,
      isActive: active,
      expiresAt: periodEnd,
      stripeSubscriptionId: sub.id,
      stripeStatus: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
    update: {
      planType,
      isActive: active,
      expiresAt: periodEnd,
      stripeStatus: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
  });
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
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
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
