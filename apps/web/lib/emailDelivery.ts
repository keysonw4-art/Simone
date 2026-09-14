import { randomUUID } from 'node:crypto';
import { Prisma, prisma } from '@repo/database';
import type { SendResult } from '@repo/email';

export async function deliverOnce(key: string, send: (createdAt: Date) => Promise<SendResult>) {
  try { await prisma.emailDelivery.create({ data: { key } }); }
  catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
  const token = randomUUID();
  const claim = await prisma.emailDelivery.updateMany({
    where: { key, sentAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + 120_000), leaseToken: token, attempts: { increment: 1 } },
  });
  if (!claim.count) return Boolean((await prisma.emailDelivery.findUnique({ where: { key } }))?.sentAt);
  const delivery = await prisma.emailDelivery.findUniqueOrThrow({ where: { key } });
  try {
    const result = await send(delivery.createdAt);
    await prisma.emailDelivery.updateMany({ where: { key, leaseToken: token }, data: {
      sentAt: result.ok ? new Date() : null, leaseUntil: result.ok ? null : new Date(Date.now() + 300_000), leaseToken: null,
    } });
    return result.ok;
  } catch (error) {
    await prisma.emailDelivery.updateMany({ where: { key, leaseToken: token }, data: {
      leaseUntil: new Date(Date.now() + 300_000), leaseToken: null,
    } });
    throw error;
  }
}
