import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import { authConfig } from "./config";
import { extractIp, logLoginFailure } from "./logging";
import { checkLoginRateLimit } from "./rateLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const origin = extractIp(request);
        const email =
          typeof credentials?.email === "string" ? credentials.email : null;

        if (!email || !credentials?.password) {
          await logLoginFailure({
            email,
            reason: "missing_credentials",
            origin,
          });
          return null;
        }

        // Rate limit ANTES da consulta ao user + bcrypt (economiza CPU e DB)
        const rl = await checkLoginRateLimit({ email, origin });
        if (rl.blocked) {
          await logLoginFailure({
            email,
            reason: "rate_limited",
            origin,
          });
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
          credentials.password as string,
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

export { authConfig };
