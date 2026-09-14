import NextAuth from "next-auth";
import { authConfig } from "@repo/auth/config";
import { NextResponse, type NextMiddleware } from "next/server";

import { createCspHeaders } from "@repo/auth/csp";

const { auth } = NextAuth(authConfig);

const handler: NextMiddleware = auth((req) => {
  const csp = createCspHeaders(req.headers, "admin");
  const next = () => {
    const response = NextResponse.next({ request: { headers: csp.headers } });
    response.headers.set("Content-Security-Policy", csp.policy);
    return response;
  };
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) || pathname === "/login";

  if (isAuthRoute) return next();

  if (pathname.startsWith("/api/") && (!isLoggedIn || (role !== "ADMIN" && role !== "SUPER_ADMIN"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(
      new URL("/login?error=AccessDenied", req.nextUrl),
    );
  }

  return next();
}) as unknown as NextMiddleware;

export default handler;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
