import type { NextAuthConfig } from "next-auth";
import type { Role } from "@repo/database";

// Runtime warning: só em server-side e só uma vez
if (typeof window === "undefined") {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.warn(
      "[@repo/auth] AUTH_SECRET não está definido. Sessões não estão seguras. " +
        "Gere um com: openssl rand -base64 32",
    );
  } else if (secret.length < 32) {
    console.warn(
      `[@repo/auth] AUTH_SECRET tem ${secret.length} caracteres — recomenda-se ao menos 32. ` +
        "Gere um mais forte com: openssl rand -base64 32",
    );
  }
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Absolute lifetime is checked below; DB revocation is checked in index.ts.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        token.authTime = Math.floor(Date.now() / 1000);
      }
      if (typeof token.authTime !== 'number' || Date.now() / 1000 - token.authTime >= 7 * 86400) return null;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
