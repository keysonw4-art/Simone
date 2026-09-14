import { getResend } from "./client";
import { FROM_EMAIL, REPLY_TO } from "./env";

export type SendResult =
  | { ok: true; id: string | undefined }
  | { ok: false; skipped?: boolean; error?: string };

/**
 * Envia um e-mail transacional. À PROVA DE FALHA por design: nunca lança.
 * Se a key não existe ou o Resend falha, loga e retorna { ok: false } — assim
 * um e-mail quebrado JAMAIS derruba o fluxo que o disparou (signup, compra…).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY ausente — e-mail "${params.subject}" NÃO enviado para ${params.to}`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo ?? REPLY_TO,
    }, params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined);

    if (error) {
      console.error(`[email] Resend recusou "${params.subject}":`, error);
      return { ok: false, error: error.message ?? String(error) };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error(`[email] exceção ao enviar "${params.subject}":`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erro desconhecido",
    };
  }
}
