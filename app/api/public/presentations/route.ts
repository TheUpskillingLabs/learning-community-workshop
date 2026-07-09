import { NextResponse } from "next/server";
import { buildPresentations, buildKeep } from "@/lib/reveal";
import { resolveSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

const EMPTY_KEEP = { labsUrl: "https://theupskillinglabs.org", slackUrl: null, keeper: null };

// Every table's six-box + the keep-going links, for the participant-browsable
// /present page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const sessionId = await resolveSessionId(explicit);
  if (!sessionId) return NextResponse.json({ tables: [], keep: EMPTY_KEEP });

  const [tables, keep] = await Promise.all([
    buildPresentations(sessionId),
    buildKeep(sessionId),
  ]);
  return NextResponse.json({ tables, keep });
}
