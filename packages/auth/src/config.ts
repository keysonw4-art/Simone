import type { NextAuthConfig } from "next-auth";

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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
