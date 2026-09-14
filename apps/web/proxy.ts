import NextAuth from "next-auth"
import { authConfig } from "@repo/auth/config"
import { NextResponse, type NextMiddleware } from "next/server"

import { createCspHeaders } from "@repo/auth/csp";

const { auth } = NextAuth(authConfig)

const handler: NextMiddleware = auth((req) => {
  const csp = createCspHeaders(req.headers, "web");
  const next = () => {
    const response = NextResponse.next({ request: { headers: csp.headers } });
    response.headers.set("Content-Security-Policy", csp.policy);
    return response;
  };
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) ||
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/esqueci-senha") ||
    pathname.startsWith("/redefinir-senha");
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/avulsos") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/validacao");

  // API handlers perform current-account and resource authorization themselves.
  if (pathname.startsWith("/api/")) return next();
  if (isAuthRoute || isPublicRoute) return next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return next();
}) as unknown as NextMiddleware

export default handler

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
