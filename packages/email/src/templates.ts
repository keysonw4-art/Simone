/**
 * Templates de e-mail em HTML puro (sem dependência de build/react-email).
 * Layout à prova de clientes de e-mail: tabelas + estilo inline + fontes
 * web-safe. Cores e voz da marca Simone Mendes (sage/charcoal/gold, sem emoji).
 */

const SAGE = "#065C5D";
const CHARCOAL = "#40304F";
const GOLD = "#C65B03";
const OFFWHITE = "#F5F5F0";
const INK = "#2b2430";
const MUTED = "#6b6675";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Escapa texto vindo do usuário (nome) antes de interpolar no HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** Botão de ação (CTA) no estilo da marca. */
function button(href: string, label: string, tone: "sage" | "gold" = "sage"): string {
  const bg = tone === "gold" ? GOLD : SAGE;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:4px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:4px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Envolve o conteúdo no cabeçalho/rodapé da marca.
 * `bodyHtml` é confiado (construído aqui); dados do usuário devem passar por
 * escapeHtml antes de serem inseridos.
 */
export function baseLayout(opts: {
  preview: string;
  heading: string;
  bodyHtml: string;
}): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${OFFWHITE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OFFWHITE};padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,0.05);">
        <tr>
          <td align="center" bgcolor="${SAGE}" style="padding:30px 40px;">
            <div style="font-family:${SERIF};font-size:22px;letter-spacing:6px;color:#ffffff;">SIMONE MENDES</div>
            <div style="font-family:${SANS};font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-top:6px;">Personal Organizer</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:26px;line-height:1.2;color:${CHARCOAL};font-weight:normal;">${opts.heading}</h1>
            <div style="font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};">
              ${opts.bodyHtml}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.6;color:${MUTED};">
              Você recebeu este e-mail porque tem uma conta na plataforma da Simone Mendes.
              <br>© ${year} Simone Mendes — Personal Organizer.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

type Built = { subject: string; html: string };

export function passwordResetTemplate(name: string | null, link: string): Built {
  const hi = name ? escapeHtml(name.split(" ")[0]!) : "Olá";
  return {
    subject: "Redefinição de senha — Simone Mendes",
    html: baseLayout({
      preview: "Link para criar uma nova senha (válido por 1 hora).",
      heading: "Redefinir sua senha",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hi}, recebemos um pedido para redefinir a senha da sua conta.</p>
        <p style="margin:0 0 8px;">Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
        ${button(link, "Criar nova senha")}
        <p style="margin:0 0 8px;color:${MUTED};font-size:13px;">Se você não pediu isso, pode ignorar este e-mail com segurança — sua senha atual continua valendo.</p>
        <p style="margin:16px 0 0;color:${MUTED};font-size:12px;word-break:break-all;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
      `,
    }),
  };
}

export function welcomeTemplate(name: string | null, link: string): Built {
  const hi = name ? escapeHtml(name.split(" ")[0]!) : "Olá";
  return {
    subject: "Bem-vinda(o) à plataforma da Simone Mendes",
    html: baseLayout({
      preview: "Sua conta foi criada. Acesse a área do aluno.",
      heading: "Sua conta está pronta",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hi}, que bom ter você aqui! Sua conta foi criada com sucesso.</p>
        <p style="margin:0 0 8px;">Na sua área você acompanha seus cursos, seu progresso e seus certificados. É só entrar:</p>
        ${button(link, "Acessar minha área")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Qualquer dúvida, é só responder este e-mail que a gente te ajuda.</p>
      `,
    }),
  };
}

export function purchaseConfirmationTemplate(params: {
  name: string | null;
  itemName: string;
  amountCents: number;
  expiresAt: Date;
  link: string;
}): Built {
  const hi = params.name ? escapeHtml(params.name.split(" ")[0]!) : "Olá";
  const item = escapeHtml(params.itemName);
  return {
    subject: `Compra confirmada — ${params.itemName}`,
    html: baseLayout({
      preview: `Seu acesso a ${params.itemName} já está liberado.`,
      heading: "Compra confirmada",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hi}, sua compra foi confirmada e seu acesso já está liberado. Bons estudos!</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;">
          <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:13px;color:${MUTED};">Curso</td>
              <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:14px;color:${INK};text-align:right;font-weight:600;">${item}</td></tr>
          <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:13px;color:${MUTED};">Valor</td>
              <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:14px;color:${INK};text-align:right;">${formatBRL(params.amountCents)}</td></tr>
          <tr><td style="padding:14px 18px;font-family:${SANS};font-size:13px;color:${MUTED};">Acesso até</td>
              <td style="padding:14px 18px;font-family:${SANS};font-size:14px;color:${INK};text-align:right;">${formatDate(params.expiresAt)}</td></tr>
        </table>
        ${button(params.link, "Começar a assistir")}
        <p style="margin:0;color:${MUTED};font-size:12px;">O recibo do pagamento é enviado separadamente pela Stripe.</p>
      `,
    }),
  };
}

export function expiryWarningTemplate(params: {
  name: string | null;
  itemName: string;
  expiresAt: Date;
  daysLeft: number;
  link: string;
}): Built {
  const hi = params.name ? escapeHtml(params.name.split(" ")[0]!) : "Olá";
  const item = escapeHtml(params.itemName);
  const days = params.daysLeft === 1 ? "1 dia" : `${params.daysLeft} dias`;
  return {
    subject: `Seu acesso expira em ${days} — ${params.itemName}`,
    html: baseLayout({
      preview: `Seu acesso a ${params.itemName} expira em ${formatDate(params.expiresAt)}.`,
      heading: "Seu acesso está perto de expirar",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hi}, passando para avisar: seu acesso a <strong>${item}</strong> expira em <strong>${days}</strong>, no dia ${formatDate(params.expiresAt)}.</p>
        <p style="margin:0 0 8px;">Se quiser aproveitar o conteúdo antes disso, é um bom momento para revisar suas aulas e baixar seus materiais.</p>
        ${button(params.link, "Acessar meus cursos", "gold")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Quer renovar ou saber sobre outros cursos? Responda este e-mail que a gente te orienta.</p>
      `,
    }),
  };
}
