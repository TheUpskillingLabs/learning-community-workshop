import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { passwordOk, signSession, ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Blunt in-room brute force.
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts, please wait." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!passwordOk(body.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signSession(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return NextResponse.json({ ok: true });
}
