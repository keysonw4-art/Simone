import { sendEmail, type SendResult } from "./send";
import { appUrl } from "./env";
import {
  passwordResetTemplate,
  welcomeTemplate,
  purchaseConfirmationTemplate,
  expiryWarningTemplate,
} from "./templates";

export { sendEmail, type SendResult } from "./send";
export { appUrl, FROM_EMAIL } from "./env";

/** E-mail com link de redefinição de senha. `token` é o valor CRU. */
export async function sendPasswordResetEmail(params: {
  to: string;
  name: string | null;
  token: string;
}): Promise<SendResult> {
  const link = `${appUrl()}/redefinir-senha?token=${encodeURIComponent(params.token)}`;
  const { subject, html } = passwordResetTemplate(params.name, link);
  return sendEmail({ to: params.to, subject, html });
}

/** E-mail de boas-vindas após o cadastro. */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string | null;
}): Promise<SendResult> {
  const link = `${appUrl()}/aluno`;
  const { subject, html } = welcomeTemplate(params.name, link);
  return sendEmail({ to: params.to, subject, html });
}

/** E-mail de confirmação de compra (disparado pelo webhook do Stripe). */
export async function sendPurchaseConfirmationEmail(params: {
  to: string;
  name: string | null;
  itemName: string;
  amountCents: number;
  expiresAt: Date;
}): Promise<SendResult> {
  const link = `${appUrl()}/aluno/cursos`;
  const { subject, html } = purchaseConfirmationTemplate({
    name: params.name,
    itemName: params.itemName,
    amountCents: params.amountCents,
    expiresAt: params.expiresAt,
    link,
  });
  return sendEmail({ to: params.to, subject, html });
}

/** E-mail de aviso de expiração de acesso (disparado pelo cron). */
export async function sendExpiryWarningEmail(params: {
  to: string;
  name: string | null;
  itemName: string;
  expiresAt: Date;
  daysLeft: number;
}): Promise<SendResult> {
  const link = `${appUrl()}/aluno/cursos`;
  const { subject, html } = expiryWarningTemplate({
    name: params.name,
    itemName: params.itemName,
    expiresAt: params.expiresAt,
    daysLeft: params.daysLeft,
    link,
  });
  return sendEmail({ to: params.to, subject, html });
}
