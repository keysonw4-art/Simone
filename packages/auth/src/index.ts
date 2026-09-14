import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import { authConfig } from "./config";
import { extractIp, logLoginFailure } from "./logging";
import { checkLoginRateLimit } from "./rateLimit";
import { EmailSchema } from "./security";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (
        !token ||
        typeof token.id !== "string" ||
        typeof token.sessionVersion !== "number"
      )
        return null;
      const user = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          role: true,
          sessionVersion: true,
          blockedAt: true,
          deletedAt: true,
        },
      });
      if (
        !user ||
        user.blockedAt ||
        user.deletedAt ||
        user.sessionVersion !== token.sessionVersion
      )
        return null;
      token.role = user.role;
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const origin = extractIp(request);
        const parsedEmail = EmailSchema.safeParse(credentials?.email);
        const email = parsedEmail.success ? parsedEmail.data : null;

        if (
          !email ||
          typeof credentials?.password !== "string" ||
          !credentials.password ||
          Buffer.byteLength(credentials.password, "utf8") > 72
        ) {
          return null;
        }

        // Rate limit ANTES da consulta ao user + bcrypt (economiza CPU e DB)
        const rl = await checkLoginRateLimit({ email, origin });
        if (rl.blocked) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          await logLoginFailure({ email, reason: "user_not_found", origin });
          return null;
        }

        if (user.deletedAt) {
          await logLoginFailure({
            email,
            reason: "user_deleted",
            origin,
            userId: user.id,
          });
          return null;
        }

        if (user.blockedAt) {
          await logLoginFailure({
            email,
            reason: "user_blocked",
            origin,
            userId: user.id,
          });
          return null;
        }

        if (!user.passwordHash) {
          await logLoginFailure({
            email,
            reason: "no_password_set",
            origin,
            userId: user.id,
          });
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!passwordsMatch) {
          await logLoginFailure({
            email,
            reason: "wrong_password",
            origin,
            userId: user.id,
          });
          return null;
        }

        // Upgrade legacy bcrypt work factors only after successful authentication.
        // Conditional write must never overwrite a simultaneous password reset.
        if (bcrypt.getRounds(user.passwordHash) < 12) {
          const upgradedHash = await bcrypt.hash(credentials.password, 12);
          await prisma.user.updateMany({
            where: {
              id: user.id,
              passwordHash: user.passwordHash,
              sessionVersion: user.sessionVersion,
              blockedAt: null,
              deletedAt: null,
            },
            data: { passwordHash: upgradedHash },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});

export { authConfig };
