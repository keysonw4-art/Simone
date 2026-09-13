"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@repo/database";
import { sendPasswordResetEmail } from "@repo/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const MAX_REQUESTS_PER_WINDOW = 3; // por usuário
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const PasswordRules = z
  .string()
  .min(10, "Senha deve ter ao menos 10 caracteres")
  .max(72, "Senha deve ter no máximo 72 caracteres")
  .refine((v) => /[a-zA-Z]/.test(v), "Senha deve conter ao menos 1 letra")
  .refine((v) => /[0-9]/.test(v), "Senha deve conter ao menos 1 número");

// ---------------------------------------------------------------------------
// 1) Pedir redefinição — "esqueci minha senha"
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(120),
});

export type ResetRequestState =
  | { ok: true }
  | { error: string }
  | undefined;

/**
 * Gera um token de redefinição e envia por e-mail. Resposta é SEMPRE genérica
 * (não revela se o e-mail existe) — só o formato inválido retorna erro.
 */
export async function requestPasswordResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = RequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Informe um e-mail válido." };
  }
  const { email } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, blockedAt: null },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  // Só emite token para conta existente com login por senha.
  if (user && user.passwordHash) {
    const recent = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) },
      },
    });

    if (recent < MAX_REQUESTS_PER_WINDOW) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });
      // Fail-safe: e-mail nunca lança; se falhar, só loga.
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// 2) Redefinir de fato — a partir do link
// ---------------------------------------------------------------------------

const ResetSchema = z
  .object({
    token: z.string().trim().min(1),
    password: PasswordRules,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });

export type ResetPasswordState =
  | { ok: true }
  | { error: string }
  | undefined;

/**
 * Valida o token e grava a nova senha. Invalida o token usado e quaisquer
 * outros tokens pendentes do mesmo usuário.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = ResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos." };
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      error:
        "Este link é inválido ou já expirou. Peça um novo em 'Esqueci minha senha'.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalida qualquer outro token pendente do usuário.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
