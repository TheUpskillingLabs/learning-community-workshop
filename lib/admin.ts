import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Facilitator ("admin") auth. The shared ADMIN_PASSWORD is checked
// server-side inside each admin Route Handler (never only on a hidden page and
// never only in middleware). On success we set a signed, httpOnly cookie whose
// value is a MAC, not the password. Every admin mutation re-verifies it.

export const ADMIN_COOKIE = "admin_session";
const COOKIE_VALUE = "ok";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

function hmacKey(): string {
  // Prefer a dedicated secret so the cookie MAC isn't derived from the very
  // password being gated; fall back to the password if not configured.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Constant-time password check against ADMIN_PASSWORD.
export function passwordOk(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(String(password ?? ""), expected);
}

// The value we store in the cookie: "ok.<hmac>".
export function signSession(): string {
  const mac = createHmac("sha256", hmacKey()).update(COOKIE_VALUE).digest("hex");
  return `${COOKIE_VALUE}.${mac}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return false;
  const value = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  if (value !== COOKIE_VALUE) return false;
  const expected = createHmac("sha256", hmacKey()).update(value).digest("hex");
  return safeEqual(mac, expected);
}

// Call at the top of every admin Route Handler before touching the DB.
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(ADMIN_COOKIE)?.value);
}
