import { consumeRateLimit } from './security';

export async function checkLoginRateLimit({ email, origin }: { email: string; origin: string }) {
  // A stranger cannot lock the victim's email across all IPs.
  const ipAllowed = await consumeRateLimit('login-ip', origin, 30, 900);
  const pairAllowed = ipAllowed && await consumeRateLimit('login-pair', `${origin}:${email}`, 8, 900);
  return { blocked: !pairAllowed, retryAfterSeconds: pairAllowed ? 0 : 900 };
}
