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

async function loadUserForCheckout(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) redirect("/login");
  return user;
}

/**
 * Modelo v2 — checkout de pagamento único de um Curso (produto).
 */
export async function startProductCheckoutAction(
  productId: string,
): Promise<void> {
  const sessionUser = await requireSession();
  if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN") {
    redirect("/aluno");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
    select: { id: true, stripePriceId: true, maxSeats: true, seatsSold: true },
  });
  if (!product || !product.stripePriceId) {
    redirect("/planos?erro=indisponivel");
  }
  if (product.maxSeats != null && product.seatsSold >= product.maxSeats) {
    redirect("/planos?erro=esgotado");
  }

  const user = await loadUserForCheckout(sessionUser.id);
  const customerId = await getOrCreateCustomer(user);
  const origin = await getOrigin();
  const stripe = getStripe();

  const meta = { userId: user.id, kind: "product", productId: product.id };
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    locale: "pt-BR",
    // Deixa o cliente escolher à vista ou parcelado (cartões BR elegíveis).
    payment_method_options: { card: { installments: { enabled: true } } },
    metadata: meta,
    payment_intent_data: { metadata: meta },
    success_url: `${origin}/aluno/cursos?compra=sucesso`,
    cancel_url: `${origin}/planos?checkout=cancelado`,
  });

  if (!checkout.url) redirect("/planos?erro=checkout");
  redirect(checkout.url);
}

/**
 * Modelo v2 — checkout de pagamento único de um Módulo avulso.
 */
export async function startModuleCheckoutAction(
  courseId: string,
): Promise<void> {
  const sessionUser = await requireSession();
  if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN") {
    redirect("/aluno");
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
      isArchived: false,
      soldStandalone: true,
    },
    select: { id: true, standaloneStripePriceId: true },
  });
  if (!course || !course.standaloneStripePriceId) {
    redirect("/avulsos?erro=indisponivel");
  }

  const user = await loadUserForCheckout(sessionUser.id);
  const customerId = await getOrCreateCustomer(user);
  const origin = await getOrigin();
  const stripe = getStripe();

  const meta = { userId: user.id, kind: "course", courseId: course.id };
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: course.standaloneStripePriceId, quantity: 1 }],
    locale: "pt-BR",
    payment_method_options: { card: { installments: { enabled: true } } },
    metadata: meta,
    payment_intent_data: { metadata: meta },
    success_url: `${origin}/aluno/cursos?compra=sucesso`,
    cancel_url: `${origin}/avulsos?checkout=cancelado`,
  });

  if (!checkout.url) redirect("/avulsos?erro=checkout");
  redirect(checkout.url);
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
