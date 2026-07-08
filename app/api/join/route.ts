import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_ROWS_PER_SESSION = 400; // generous cap for a ~150-person room

export async function POST(req: Request) {
  // Coarse per-IP backstop (see lib/ratelimit for the caveat about shared NAT).
  const rl = rateLimit(`join:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions, please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sessionId = clean(body.session_id, 64);
  const participantId = clean(body.participant_id, 64);
  const handle = clean(body.handle, 40);
  const persona = clean(body.persona_text);
  const skill = clean(body.skill_gap_text);
  const goal = clean(body.goal_text);

  if (!sessionId || !participantId) {
    return NextResponse.json({ error: "Missing session or participant id" }, { status: 400 });
  }
  if (!handle || !persona || !skill || !goal) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Session must exist (the session UUID is the bearer capability).
  const { data: session } = await admin
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "This session is not open." }, { status: 404 });
  }

  // Per-session row cap to blunt flooding.
  const { count } = await admin
    .from("intake_responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count ?? 0) >= MAX_ROWS_PER_SESSION) {
    return NextResponse.json({ error: "This session is full." }, { status: 429 });
  }

  // Upsert on (session_id, participant_id) so an honest refresh/re-submit
  // updates rather than duplicates.
  const { error } = await admin.from("intake_responses").upsert(
    {
      session_id: sessionId,
      participant_id: participantId,
      handle,
      persona_text: persona,
      skill_gap_text: skill,
      goal_text: goal,
    },
    { onConflict: "session_id,participant_id" }
  );
  if (error) {
    return NextResponse.json({ error: "Could not save your response." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
