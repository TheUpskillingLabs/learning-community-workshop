import { NextResponse } from "next/server";
import { resolveSessionId } from "@/lib/session";
import { buildShowcase } from "@/lib/reveal";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Currently-showcased six-box for the /showcase big screen to hydrate on load.
// (Live updates thereafter arrive via Broadcast on showcase:<sessionId>.)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const sessionId = await resolveSessionId(explicit);
  if (!sessionId) return NextResponse.json({ showcase: null });
  return NextResponse.json({ showcase: await buildShowcase(sessionId) });
}
