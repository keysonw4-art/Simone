import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { sendExpiryWarningEmail } from "@repo/email";
import { consumeRateLimit } from "@repo/auth/security";
import { deliverOnce } from "@/lib/emailDelivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + (secret ?? ""));
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!await consumeRateLimit("cron", "expiry", 2, 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const key = "expiry-warning";
  const leaseToken = randomUUID();
  await prisma.jobState.upsert({ where: { key }, create: { key }, update: {} });
  const claim = await prisma.jobState.updateMany({
    where: { key, OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + 65_000), leaseToken },
  });
  if (!claim.count) return NextResponse.json({ ok: true, busy: true });
  const started = Date.now();
  let sent = 0, failed = 0, processed = 0;
  try {
    const state = await prisma.jobState.findUniqueOrThrow({ where: { key } });
    let cursor = state.cursor;
    while (Date.now() - started < 40_000 && processed < 200) {
      const now = new Date();
      const window = { gt: now, lte: new Date(Date.now() + 7 * 86400_000) };
      const purchases = await prisma.purchase.findMany({
        where: { ...(cursor ? { id: { gt: cursor } } : {}), status: "PAID", accessSuspended: false,
          user: { blockedAt: null, deletedAt: null },
          entitlements: { some: { expiryWarnedAt: null, expiresAt: window } } },
        orderBy: { id: "asc" }, take: 25,
        include: { user: { select: { email: true, name: true } }, product: { select: { name: true } },
          course: { select: { title: true } },
          entitlements: { where: { expiryWarnedAt: null, expiresAt: window }, select: { id: true, expiresAt: true } } },
      });
      if (!purchases.length) {
        await prisma.jobState.updateMany({ where: { key, leaseToken }, data: { cursor: null } });
        break;
      }
      for (const purchase of purchases) {
        if (Date.now() - started > 40_000) break;
        const expiresAt = purchase.entitlements[0]?.expiresAt;
        if (expiresAt) {
          const deliveryKey = "expiry-" + purchase.id + "-" + expiresAt.getTime();
          try {
            const ok = await deliverOnce(deliveryKey, createdAt => sendExpiryWarningEmail({
              to: purchase.user.email, name: purchase.user.name,
              itemName: purchase.product?.name ?? purchase.course?.title ?? "seus cursos", expiresAt,
              daysLeft: Math.max(1, Math.ceil((expiresAt.getTime() - createdAt.getTime()) / 86400_000)),
              idempotencyKey: deliveryKey,
            }));
            if (ok) {
              await prisma.entitlement.updateMany({ where: {
                id: { in: purchase.entitlements.filter(e => e.expiresAt.getTime() === expiresAt.getTime()).map(e => e.id) },
                expiresAt,
              }, data: { expiryWarnedAt: new Date() } });
              sent++;
            } else failed++;
          } catch { failed++; }
        }
        cursor = purchase.id;
        processed++;
        // Advance even after provider failure, so one bad recipient cannot starve the batch.
        await prisma.jobState.updateMany({ where: { key, leaseToken }, data: { cursor } });
      }
    }
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } } });
    await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
    if (failed) console.warn("[expiry-warning] deliveries pending retry", { failed, sent, processed });
    return NextResponse.json({ ok: true, sent, failed, processed }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await prisma.jobState.updateMany({ where: { key, leaseToken }, data: { leaseToken: null, leaseUntil: null } });
  }
}
