import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@repo/database';

export const IdSchema = z.string().uuid();
export const EmailSchema = z.string().trim().toLowerCase().email().max(120);
export const PasswordSchema = z.string().min(10).max(72)
  .refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Senha deve ter no máximo 72 bytes')
  .refine(v => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Use letras e números');

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Muitas solicitações. Aguarde alguns minutos e tente novamente.');
    this.name = 'RateLimitError';
  }
}

// Fixed window with atomic UPSERT. Denied requests never extend the window.
export async function consumeRateLimit(scope: string, identity: string, limit: number, seconds: number) {
  const key = createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const result = await prisma.$queryRaw<{ hits: number }[]>`
    INSERT INTO "RateLimit" ("key", "hits", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${seconds} * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "RateLimit"."hits" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + ${seconds} * interval '1 second' ELSE "RateLimit"."expiresAt" END
    WHERE "RateLimit"."expiresAt" <= CURRENT_TIMESTAMP OR "RateLimit"."hits" < ${limit}
    RETURNING "hits"`;
  return result.length === 1;
}

export async function enforceRateLimit(scope: string, identity: string, limit: number, seconds = 60) {
  if (!(await consumeRateLimit(scope, identity, limit, seconds))) throw new RateLimitError(seconds);
}

export async function requestIp() {
  const h = await headers();
  return (h.get('x-vercel-forwarded-for') ?? h.get('x-forwarded-for') ?? h.get('x-real-ip'))
    ?.split(',')[0]?.trim().slice(0, 64) || 'unknown';
}

export function safeRedirectTo(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
