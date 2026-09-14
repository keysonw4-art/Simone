"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@repo/database";
import { sendPasswordResetEmail } from "@repo/email";
import { consumeRateLimit, requestIp, PasswordSchema, EmailSchema } from "./security";

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export type ResetRequestState = { ok: true } | { error: string } | undefined;
export type ResetPasswordState = { ok: true } | { error: string } | undefined;

export async function requestPasswordResetAction(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const parsed = EmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  const email = parsed.data;
  const ip = await requestIp();
  if (!await consumeRateLimit("reset-ip", ip, 10, 900)) return { ok: true };
  if (!await consumeRateLimit("reset-email", email, 3, 900)) return { ok: true };
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, blockedAt: null },
    select: { id: true, email: true, name: true, passwordHash: true, sessionVersion: true },
  });
  if (user?.passwordHash) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), sessionVersion: user.sessionVersion,
        expiresAt: new Date(Date.now() + 3600_000) },
    });
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
  }
  return { ok: true };
}

const ResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: PasswordSchema,
  confirm: z.string().max(72),
}).refine(d => d.password === d.confirm, { message: "As senhas não conferem" });

export async function resetPasswordAction(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const invalid = { error: "Link inválido, utilizado ou expirado. Peça um novo em 'Esqueci minha senha'." };
  if (!await consumeRateLimit("reset-consume-ip", await requestIp(), 15, 900)) return invalid;
  const parsed = ResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Verifique o link e use senhas iguais, com letras e números (10 a 72 bytes)." };
  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date() || record.sessionVersion < 0) return invalid;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const changed = await prisma.$transaction(async tx => {
    // Serialize reset and user revocation on the user row; two different tokens
    // for the same credential generation must not both change the password.
    const user = await tx.user.updateMany({
      where: { id: record.userId, blockedAt: null, deletedAt: null, sessionVersion: record.sessionVersion },
      data: { sessionVersion: { increment: 1 } },
    });
    if (user.count !== 1) return false;
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() }, sessionVersion: record.sessionVersion },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("RESET_TOKEN_CONFLICT");
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() },
    });
    await tx.auditLog.create({ data: { userId: record.userId, action: "user.password_reset" } });
    return true;
  }).catch(error => {
    if (error instanceof Error && error.message === "RESET_TOKEN_CONFLICT") return false;
    throw error;
  });
  return changed ? { ok: true } : invalid;
}
