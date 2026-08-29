import NextAuth from "next-auth"
import { authConfig } from "@repo/auth/config"
import { NextResponse, type NextMiddleware } from "next/server"

const { auth } = NextAuth(authConfig)

const handler: NextMiddleware = auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/avulsos") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/validacao");

  if (isAuthRoute || isPublicRoute) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}) as unknown as NextMiddleware

export default handler

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
