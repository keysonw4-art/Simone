/**
 * Configuração de ambiente do e-mail. Tudo com fallback seguro para não
 * quebrar em dev/preview sem as envs — o envio em si degrada com log
 * (ver send.ts), nunca com exceção.
 */

/** URL canônica da app do aluno, base dos links nos e-mails. */
export function appUrl(): string {
  const raw = process.env.APP_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://simone-site-web.vercel.app");
  const url = new URL(raw);
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((!local && url.protocol !== "https:") || url.username || url.password) throw new Error("APP_URL inválida");
  return url.origin;
}

/**
 * Remetente. Antes de verificar um domínio no Resend, só dá pra enviar de
 * `onboarding@resend.dev` (e só para o e-mail dono da conta). Depois de
 * verificar o domínio da Simone, defina EMAIL_FROM, ex.:
 *   EMAIL_FROM="Simone Mendes <contato@simonemendes.com.br>"
 */
export const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "Simone Mendes <onboarding@resend.dev>";

/** Reply-to opcional (suporte). */
export const REPLY_TO = process.env.EMAIL_REPLY_TO ?? undefined;
