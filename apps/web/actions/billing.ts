"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { getStripe } from "@/lib/stripe";
import { requireSession } from "@/lib/subscriptionGuard";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Garante um Stripe Customer para o usuário (cria e persiste na 1ª vez).
 */
async function getOrCreateCustomer(user: {
  id: string;
  email: string | null;
  name: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Inicia o checkout de assinatura para um plano.
 * Server action chamada pelo botão "Assinar" em /planos.
 */
export async function startCheckoutAction(planId: string): Promise<void> {
  const sessionUser = await requireSession();

  // Staff não assina.
  if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN") {
    redirect("/aluno");
  }

  // Já tem assinatura ativa? Manda pro portal em vez de cobrar de novo.
  const active = await prisma.subscription.findFirst({
    where: {
      userId: sessionUser.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (active) {
    redirect("/aluno/cursos");
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId, isActive: true, deletedAt: null },
    select: { id: true, type: true, stripePriceId: true },
  });

  if (!plan || !plan.stripePriceId) {
    redirect("/planos?erro=indisponivel");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) redirect("/login");

  const customerId = await getOrCreateCustomer(user);
  const origin = await getOrigin();
  const stripe = getStripe();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    locale: "pt-BR",
    allow_promotion_codes: true,
    // Metadados espelhados na assinatura pra o webhook saber o plano/usuário.
    subscription_data: {
      metadata: { userId: user.id, planType: plan.type },
    },
    metadata: { userId: user.id, planType: plan.type },
    success_url: `${origin}/aluno/cursos?assinatura=sucesso`,
    cancel_url: `${origin}/planos?checkout=cancelado`,
  });

  if (!checkout.url) {
    redirect("/planos?erro=checkout");
  }

  redirect(checkout.url);
}

/**
 * Abre o Billing Portal do Stripe (cancelar, trocar cartão, ver faturas).
 */
export async function openBillingPortalAction(): Promise<void> {
  const sessionUser = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    redirect("/aluno?erro=sem-assinatura");
  }

  const origin = await getOrigin();
  const stripe = getStripe();

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/aluno`,
  });

  redirect(portal.url);
}
