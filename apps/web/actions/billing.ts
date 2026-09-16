"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { appUrl } from "@repo/email";
import { IdSchema, consumeRateLimit } from "@repo/auth/security";
import { getStripe } from "@/lib/stripe";
import { requireSession } from "@/lib/subscriptionGuard";
import { getUserAccess } from "@/lib/entitlements";
import { PurchaseSnapshotSchema, type PurchaseSnapshot } from "@/lib/commerce";

type CheckoutOffer = {
  snapshot: PurchaseSnapshot;
  returnPath: string;
};

function paymentErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const stripeError = error as Error & {
    type?: unknown;
    code?: unknown;
    statusCode?: unknown;
    requestId?: unknown;
  };
  return {
    name: stripeError.name,
    type: typeof stripeError.type === "string" ? stripeError.type : undefined,
    code: typeof stripeError.code === "string" ? stripeError.code : undefined,
    statusCode:
      typeof stripeError.statusCode === "number"
        ? stripeError.statusCode
        : undefined,
    requestId:
      typeof stripeError.requestId === "string"
        ? stripeError.requestId
        : undefined,
  };
}

function isMissingStripeResource(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "resource_missing"
  );
}

async function releasePendingPurchase(
  purchaseId: string,
  stripeCheckoutSessionId: string | null = null,
): Promise<void> {
  await prisma.purchase.updateMany({
    where: {
      id: purchaseId,
      status: "PENDING",
      stripeCheckoutSessionId,
    },
    data: {
      pendingKey: null,
      checkoutExpiresAt: null,
      checkoutUrl: null,
    },
  });
}

async function ensureStripeCustomer(
  stripe: Stripe,
  account: { id: string; email: string; stripeCustomerId: string | null },
  purchaseId: string,
): Promise<string> {
  const storedCustomerId = account.stripeCustomerId;

  if (storedCustomerId) {
    try {
      const storedCustomer = await stripe.customers.retrieve(storedCustomerId);
      if (!storedCustomer.deleted) return storedCustomer.id;
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }

    // A troca de conta/sandbox Stripe ou a exclusão manual de um cliente pode
    // deixar um cus_ órfão. Limpa somente se ninguém já o substituiu.
    await prisma.user.updateMany({
      where: { id: account.id, stripeCustomerId: storedCustomerId },
      data: { stripeCustomerId: null },
    });
    console.warn("[checkout] stale Stripe customer replaced", {
      userId: account.id,
    });
  }

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: account.id },
    select: { stripeCustomerId: true },
  });
  if (current.stripeCustomerId) return current.stripeCustomerId;

  const customer = await stripe.customers.create(
    { email: account.email, metadata: { userId: account.id } },
    { idempotencyKey: `customer-v2-${account.id}-${purchaseId}` },
  );

  // Evita sobrescrever um cliente criado por outra compra simultânea.
  const claimed = await prisma.user.updateMany({
    where: { id: account.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (claimed.count === 1) return customer.id;

  const concurrent = await prisma.user.findUniqueOrThrow({
    where: { id: account.id },
    select: { stripeCustomerId: true },
  });
  return concurrent.stripeCustomerId ?? customer.id;
}

async function startCheckout(kind: "product" | "course", id: string) {
  const user = await requireSession();
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/aluno");
  const catalog = kind === "product" ? "/planos" : "/avulsos";
  if (!IdSchema.safeParse(id).success) redirect(catalog + "?erro=indisponivel");
  if (!(await consumeRateLimit("checkout", user.id, 10, 600)))
    redirect(catalog + "?erro=limite");
  const stripe = getStripe();
  const checkoutOffer = await loadOffer(kind, id);
  if (!checkoutOffer) redirect(catalog + "?erro=indisponivel");
  const { snapshot, returnPath } = checkoutOffer;
  const access = await getUserAccess(user.id);
  if (
    access.grantsAll ||
    (!snapshot.grantsAll &&
      snapshot.courseIds.every((c) => access.courseIds.has(c)))
  )
    redirect("/aluno/cursos?ja=possui");

  // The public price and Stripe Price must describe the same one-time purchase.
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(snapshot.priceId);
  } catch (error) {
    console.error(
      "[checkout] Stripe price lookup failed",
      paymentErrorDetails(error),
    );
    redirect(returnPath + "?erro=preco");
  }
  if (
    !price.active ||
    price.type !== "one_time" ||
    price.currency !== snapshot.currency ||
    price.unit_amount !== snapshot.priceCents
  ) {
    console.error("[checkout] price mismatch", { kind, id });
    redirect(returnPath + "?erro=preco");
  }

  const pendingKey = user.id + ":" + kind + ":" + id;
  let purchase;
  try {
    purchase = await prisma.$transaction(async (tx) => {
      // Transaction-scoped lock works with the Supabase transaction pooler.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"checkout:" + kind + ":" + id}, 0))::text`;
      const now = new Date();
      await tx.purchase.updateMany({
        where: {
          pendingKey,
          status: "PENDING",
          checkoutExpiresAt: { lte: now },
        },
        data: { pendingKey: null },
      });
      const existing = await tx.purchase.findUnique({ where: { pendingKey } });
      if (existing) return existing;
      if (kind === "product") {
        const current = await tx.product.findFirst({
          where: { id, deletedAt: null, isActive: true },
        });
        if (!current) return null;
        if (current.maxSeats !== null) {
          const reserved = await tx.purchase.count({
            where: {
              productId: id,
              OR: [
                { status: "PAID" },
                { status: "PENDING", checkoutExpiresAt: { gt: now } },
              ],
            },
          });
          if (reserved >= current.maxSeats) return null;
        }
      }
      return tx.purchase.create({
        data: {
          userId: user.id,
          productId: kind === "product" ? id : null,
          courseId: kind === "course" ? id : null,
          amountCents: snapshot.priceCents,
          pendingKey,
          snapshot,
          checkoutExpiresAt: new Date(Date.now() + 31 * 60_000),
        },
      });
    });
  } catch (error) {
    console.error(
      "[checkout] purchase reservation failed",
      paymentErrorDetails(error),
    );
    redirect(returnPath + "?erro=pagamento");
  }
  if (!purchase) redirect(returnPath + "?erro=esgotado");
  if (purchase.status !== "PENDING") redirect("/aluno/cursos?ja=possui");

  if (purchase.checkoutUrl && purchase.stripeCheckoutSessionId) {
    let existingCheckout: Stripe.Checkout.Session;
    try {
      existingCheckout = await stripe.checkout.sessions.retrieve(
        purchase.stripeCheckoutSessionId,
      );
    } catch (error) {
      console.error(
        "[checkout] cached session lookup failed",
        paymentErrorDetails(error),
      );
      if (isMissingStripeResource(error)) {
        await releasePendingPurchase(
          purchase.id,
          purchase.stripeCheckoutSessionId,
        );
      }
      redirect(returnPath + "?erro=pagamento");
    }

    if (existingCheckout.status === "open" && existingCheckout.url) {
      redirect(existingCheckout.url);
    }
    if (existingCheckout.status === "complete") {
      redirect("/aluno/cursos?compra=sucesso");
    }

    await releasePendingPurchase(purchase.id, purchase.stripeCheckoutSessionId);
    redirect(returnPath + "?erro=pagamento");
  }

  const purchaseSnapshot = PurchaseSnapshotSchema.parse(purchase.snapshot);
  let checkoutId: string | null = null;
  let checkoutUrl: string | null = null;

  try {
    const account = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const customerId = await ensureStripeCustomer(stripe, account, purchase.id);
    const metadata = {
      userId: user.id,
      purchaseId: purchase.id,
      kind,
      [kind === "product" ? "productId" : "courseId"]: id,
    };
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: customerId,
        client_reference_id: purchase.id,
        line_items: [{ price: purchaseSnapshot.priceId, quantity: 1 }],
        locale: "pt-BR",
        payment_method_types: ["card"],
        payment_method_options: { card: { installments: { enabled: true } } },
        metadata,
        payment_intent_data: { metadata },
        expires_at:
          Math.floor(purchase.checkoutExpiresAt!.getTime() / 1000) - 30,
        success_url: appUrl() + "/aluno/cursos?compra=sucesso",
        cancel_url: appUrl() + returnPath + "?checkout=cancelado",
      },
      { idempotencyKey: "checkout-v1-" + purchase.id },
    );
    if (!checkout.url) throw new Error("Stripe Checkout returned no URL");
    checkoutId = checkout.id;
    checkoutUrl = checkout.url;
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        stripeCheckoutSessionId: checkout.id,
        checkoutUrl: checkout.url,
      },
    });
  } catch (error) {
    console.error(
      "[checkout] session creation failed",
      paymentErrorDetails(error),
    );
    if (checkoutId) {
      await stripe.checkout.sessions
        .expire(checkoutId)
        .catch((expireError: unknown) => {
          console.error(
            "[checkout] orphan session expiry failed",
            paymentErrorDetails(expireError),
          );
        });
    }
    await releasePendingPurchase(purchase.id).catch((releaseError: unknown) => {
      console.error(
        "[checkout] pending purchase release failed",
        paymentErrorDetails(releaseError),
      );
    });
    redirect(returnPath + "?erro=pagamento");
  }

  if (!checkoutUrl) {
    await releasePendingPurchase(purchase.id);
    redirect(returnPath + "?erro=pagamento");
  }
  redirect(checkoutUrl);
}

async function loadOffer(
  kind: "product" | "course",
  id: string,
): Promise<CheckoutOffer | null> {
  if (kind === "course") {
    const c = await prisma.course.findFirst({
      where: { id, deletedAt: null, isArchived: false, soldStandalone: true },
    });
    if (!c?.standaloneStripePriceId || !c.standalonePriceCents) return null;
    return {
      snapshot: PurchaseSnapshotSchema.parse({
        version: 1,
        kind,
        id,
        name: c.title,
        priceId: c.standaloneStripePriceId,
        priceCents: c.standalonePriceCents,
        currency: "brl",
        accessMonths: 12,
        grantsAll: false,
        courseIds: [id],
        certificateType: "DECLARATION",
      }),
      returnPath: "/avulsos",
    };
  }
  const p = await prisma.product.findFirst({
    where: { id, deletedAt: null, isActive: true },
    include: { productCourses: { include: { course: true } } },
  });
  if (!p?.stripePriceId || !p.priceCents) return null;
  const courseIds = p.productCourses
    .filter((c) => !c.course.deletedAt && !c.course.isArchived)
    .map((c) => c.courseId);
  // ALL access does not imply that every future module belongs to the certificate curriculum.
  if (!p.grantsAll && !courseIds.length) return null;
  return {
    snapshot: PurchaseSnapshotSchema.parse({
      version: 1,
      kind,
      id,
      name: p.name,
      priceId: p.stripePriceId,
      priceCents: p.priceCents,
      currency: "brl",
      accessMonths: p.accessMonths,
      grantsAll: p.grantsAll,
      courseIds,
      certificateType: p.certificateType,
    }),
    returnPath: `/planos/${encodeURIComponent(p.slug)}`,
  };
}

export async function startProductCheckoutAction(
  productId: string,
): Promise<void> {
  await startCheckout("product", productId);
}
export async function startModuleCheckoutAction(
  courseId: string,
): Promise<void> {
  await startCheckout("course", courseId);
}
