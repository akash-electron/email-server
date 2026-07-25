import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

const AUTH_ROUTES = ["/login", "/signup"];

/**
 * UX-level guard only — redirects unauthenticated users away from the
 * dashboard and logged-in users away from the auth pages. This is NOT the
 * security boundary: every Server Action independently calls requireUser()
 * (see src/lib/auth.ts) because a matcher change here could silently stop
 * covering an action without anyone noticing.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const session = token ? verifySession(token) : null;
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/domains", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
