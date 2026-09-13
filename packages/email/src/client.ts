import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Client Resend lazy. Retorna null se RESEND_API_KEY não estiver definido —
 * o chamador (send.ts) trata isso degradando com log, sem lançar.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}
