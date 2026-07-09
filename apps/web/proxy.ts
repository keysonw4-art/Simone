import NextAuth from "next-auth"
import { authConfig } from "@repo/auth/config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/validacao");

  if (isAuthRoute || isPublicRoute) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
