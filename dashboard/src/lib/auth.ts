import "server-only";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const AUTH_COOKIE = "auth_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export type SessionPayload = {
  userId: string;
  email: string;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Every Server Action that mutates or reads user-owned data must call this
 * first. proxy.ts guards page navigation for UX, but per Next's own docs a
 * route/matcher change can silently drop that coverage for a Server Action
 * (it's a POST to the page route, not a separate path) — so authorization
 * must be re-checked inside the action itself, not assumed from proxy.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
