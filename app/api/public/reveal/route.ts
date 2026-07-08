import { NextResponse } from "next/server";
import { resolveSessionId } from "@/lib/session";
import { buildReveal } from "@/lib/reveal";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Curated table assignments for the /reveal big screen to hydrate on load.
// (Live updates thereafter arrive via Broadcast on reveal:<sessionId>.)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const sessionId = await resolveSessionId(explicit);
  if (!sessionId) return NextResponse.json({ tables: [] });
  return NextResponse.json(await buildReveal(sessionId));
}
