import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { sendExpiryWarningEmail } from "@repo/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WARN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cron diário: avisa alunos cujo acesso expira nos próximos 7 dias.
 * Agrupado por COMPRA (um bundle = várias entitlements com o mesmo purchaseId
 * e mesma data) → 1 e-mail por compra, marcando todas como avisadas.
 *
 * Protegido por CRON_SECRET (Vercel Cron manda `Authorization: Bearer <secret>`).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron expiry] CRON_SECRET ausente");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + WARN_WINDOW_DAYS * DAY_MS);

  const ents = await prisma.entitlement.findMany({
    where: {
      expiryWarnedAt: null,
      expiresAt: { gt: now, lte: soon },
    },
    select: {
      id: true,
      purchaseId: true,
      expiresAt: true,
      purchase: {
        select: {
          product: { select: { name: true } },
          course: { select: { title: true } },
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  // Agrupa por compra.
  const groups = new Map<
    string,
    { ids: string[]; expiresAt: Date; itemName: string; email: string | null; name: string | null }
  >();
  for (const e of ents) {
    const g = groups.get(e.purchaseId);
    if (g) {
      g.ids.push(e.id);
      continue;
    }
    groups.set(e.purchaseId, {
      ids: [e.id],
      expiresAt: e.expiresAt,
      itemName:
        e.purchase.product?.name ?? e.purchase.course?.title ?? "seus cursos",
      email: e.purchase.user?.email ?? null,
      name: e.purchase.user?.name ?? null,
    });
  }

  let sent = 0;
  let failed = 0;

  for (const g of groups.values()) {
    const daysLeft = Math.max(
      1,
      Math.ceil((g.expiresAt.getTime() - now.getTime()) / DAY_MS),
    );

    if (g.email) {
      const res = await sendExpiryWarningEmail({
        to: g.email,
        name: g.name,
        itemName: g.itemName,
        expiresAt: g.expiresAt,
        daysLeft,
      });
      if (res.ok) sent++;
      else failed++;
    }

    // Marca como avisado mesmo se o envio degradou (sem key) — evita
    // acúmulo/reenvio infinito; um novo ciclo de compra gera novas entitlements.
    await prisma.entitlement.updateMany({
      where: { id: { in: g.ids } },
      data: { expiryWarnedAt: now },
    });
  }

  return NextResponse.json({
    ok: true,
    groups: groups.size,
    sent,
    failed,
  });
}
