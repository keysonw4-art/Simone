import NextAuth from "next-auth";
import { authConfig } from "@repo/auth/config";
import { NextResponse, type NextMiddleware } from "next/server";

const { auth } = NextAuth(authConfig);

const handler: NextMiddleware = auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/api/auth") || pathname.startsWith("/login");

  if (isAuthRoute) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(
      new URL("/login?error=AccessDenied", req.nextUrl),
    );
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export default handler;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
