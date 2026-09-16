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
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

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
function button(
  href: string,
  label: string,
  tone: "sage" | "gold" = "sage",
): string {
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
              © ${year} Simone Mendes — Personal Organizer.
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

function greeting(name: string | null): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `Olá, ${escapeHtml(firstName)}.` : "Olá.";
}

export function passwordResetTemplate(
  name: string | null,
  link: string,
): Built {
  const hello = greeting(name);
  return {
    subject: "Solicitação de redefinição de senha — Simone Mendes",
    html: baseLayout({
      preview: "Redefina sua senha por meio de um link válido por 1 hora.",
      heading: "Redefinição de senha",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hello}</p>
        <p style="margin:0 0 8px;">Recebemos uma solicitação para redefinir a senha da sua conta. Use o botão abaixo para definir uma nova senha. Por segurança, este link expira em <strong>1 hora</strong>.</p>
        ${button(link, "Redefinir senha")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Caso não reconheça esta solicitação, nenhuma ação é necessária. Sua senha permanecerá inalterada.</p>
      `,
    }),
  };
}

export function welcomeTemplate(name: string | null, link: string): Built {
  const hello = greeting(name);
  return {
    subject: "Boas-vindas à plataforma Simone Mendes",
    html: baseLayout({
      preview: "Sua conta na plataforma Simone Mendes está pronta.",
      heading: "Sua conta está pronta",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hello}</p>
        <p style="margin:0 0 8px;">Sua conta foi criada com sucesso. Na área do aluno, você poderá acessar seus cursos, acompanhar seu progresso e consultar seus certificados.</p>
        ${button(link, "Acessar área do aluno")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Caso precise de suporte, responda a este e-mail. Nossa equipe está à disposição.</p>
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
  const hello = greeting(params.name);
  const item = escapeHtml(params.itemName);
  return {
    subject: `Confirmação de compra — ${params.itemName}`,
    html: baseLayout({
      preview: "Pagamento confirmado. Seu acesso já está disponível.",
      heading: "Compra confirmada",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hello}</p>
        <p style="margin:0 0 16px;">Confirmamos o pagamento de sua compra. O acesso ao conteúdo já está disponível na área do aluno.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;">
          <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:13px;color:${MUTED};">Curso</td>
              <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:14px;color:${INK};text-align:right;font-weight:600;">${item}</td></tr>
          <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:13px;color:${MUTED};">Valor</td>
              <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.06);font-family:${SANS};font-size:14px;color:${INK};text-align:right;">${formatBRL(params.amountCents)}</td></tr>
          <tr><td style="padding:14px 18px;font-family:${SANS};font-size:13px;color:${MUTED};">Acesso até</td>
              <td style="padding:14px 18px;font-family:${SANS};font-size:14px;color:${INK};text-align:right;">${formatDate(params.expiresAt)}</td></tr>
        </table>
        ${button(params.link, "Acessar área do aluno")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Desejamos uma excelente experiência de aprendizado.</p>
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
  const hello = greeting(params.name);
  const item = escapeHtml(params.itemName);
  const days = params.daysLeft === 1 ? "1 dia" : `${params.daysLeft} dias`;
  return {
    subject: `Acesso disponível até ${formatDate(params.expiresAt)} — ${params.itemName}`,
    html: baseLayout({
      preview: `Informações sobre o período de acesso a ${params.itemName}.`,
      heading: "Informação sobre seu acesso",
      bodyHtml: `
        <p style="margin:0 0 16px;">${hello}</p>
        <p style="margin:0 0 8px;">Seu acesso a <strong>${item}</strong> ficará disponível até <strong>${formatDate(params.expiresAt)}</strong>. Restam <strong>${days}</strong> para revisar as aulas e baixar os materiais disponíveis.</p>
        ${button(params.link, "Acessar cursos", "gold")}
        <p style="margin:0;color:${MUTED};font-size:13px;">Para informações sobre renovação, responda a este e-mail. Nossa equipe está à disposição.</p>
      `,
    }),
  };
}
