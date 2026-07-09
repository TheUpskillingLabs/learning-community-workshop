import { NextResponse } from "next/server";
import { buildMe } from "@/lib/reveal";
import { resolveSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// The participant's own status for the "my table" hub: keyed by the
// localStorage participant_id, so a phone can show the assignment the moment it
// lands, without watching the projector. Scoped to the caller's own table.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const sessionId = await resolveSessionId(explicit);
  const participantId = clean(url.searchParams.get("participant_id"), 64);

  const emptyKeep = {
    labsUrl: "https://theupskillinglabs.org",
    slackUrl: null,
    keeper: null,
  };
  if (!sessionId || !participantId) {
    return NextResponse.json({
      logged: false,
      handle: "",
      goalText: "",
      table: null,
      tablemates: [],
      keep: emptyKeep,
    });
  }

  const me = await buildMe(sessionId, participantId);
  return NextResponse.json(me);
}
