"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@repo/database";
import { sendWelcomeEmail } from "@repo/email";
import { signIn } from "./index";
import { consumeRateLimit, requestIp, safeRedirectTo, PasswordSchema } from './security';

export type LoginFormState = { error: string } | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const redirectTo = safeRedirectTo(formData.get('redirectTo'));
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "E-mail ou senha incorretos." };
        default:
          return { error: "Ocorreu um erro no servidor." };
      }
    }
    throw error;
  }
}

const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter ao menos 2 caracteres")
    .max(80, "Nome deve ter no máximo 80 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .max(120, "E-mail deve ter no máximo 120 caracteres"),
  password: PasswordSchema,
  acceptTerms: z
    .literal("on", {
      errorMap: () => ({ message: "Você precisa aceitar os termos para continuar" }),
    }),
});

export type SignupFieldErrors = Partial<{
  name: string;
  email: string;
  password: string;
  acceptTerms: string;
  form: string;
}>;

export type SignupFormState = { errors: SignupFieldErrors } | undefined;

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: SignupFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SignupFieldErrors;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { errors };
  }

  const { name, email, password } = parsed.data;

  // Rate limit por IP: barra criação em massa de contas e enumeração
  // automatizada de e-mails cadastrados.
  const origin = await requestIp();
  if (!await consumeRateLimit('signup-ip', origin, 5, 900) ||
      !await consumeRateLimit('signup-email', email, 3, 86400)) {
    return { errors: { form: "Muitas tentativas. Aguarde antes de tentar novamente." } };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: "E-mail já cadastrado" } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const year = new Date().getFullYear();

  try {
    await prisma.$transaction(async (tx) => {
      const counter = await tx.publicIdCounter.upsert({
        where: { year },
        update: { lastNumber: { increment: 1 } },
        create: { year, lastNumber: 1 },
      });

      const publicId = `SIM-${year}-${String(counter.lastNumber).padStart(4, "0")}`;

      await tx.user.create({
        data: {
          publicId,
          email,
          passwordHash,
          name,
          role: "STUDENT",
          acceptedTermsAt: new Date(),
        },
      });
    });
  } catch (error) {
    console.error("[signup] failed to create user:", error);
    return { errors: { form: "Não foi possível criar a conta. Tente novamente." } };
  }

  // E-mail de boas-vindas (fail-safe: nunca derruba o cadastro).
  await sendWelcomeEmail({ to: email, name });

  const redirectTo = safeRedirectTo(formData.get('redirectTo'));

  try {
    await signIn("credentials", { email, password, redirectTo });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        errors: {
          form: "Conta criada, mas falha no login automático. Use a tela de login.",
        },
      };
    }
    throw error;
  }
}
