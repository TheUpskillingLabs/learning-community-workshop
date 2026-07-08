import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { buildReveal } from "@/lib/reveal";
import { broadcast, revealTopic } from "@/lib/supabase/broadcast";

export const runtime = "nodejs";

// Move one participant to a different table (or to unassigned), then re-push
// the reveal screen. This is the manual safety valve for the AI grouping.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sessionId = clean(body.session_id, 64);
  const intakeId = clean(body.intake_id, 64);
  const tableIdRaw = body.table_id == null ? null : clean(body.table_id, 64);
  if (!sessionId || !intakeId) {
    return NextResponse.json({ error: "missing ids" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // If a table id is given, verify it belongs to this session.
  if (tableIdRaw) {
    const { data } = await admin
      .from("tables")
      .select("id")
      .eq("id", tableIdRaw)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }

  const { error } = await admin
    .from("intake_responses")
    .update({ table_id: tableIdRaw })
    .eq("id", intakeId)
    .eq("session_id", sessionId);
  if (error) {
    return NextResponse.json({ error: "Could not reassign." }, { status: 500 });
  }

  await broadcast(revealTopic(sessionId), "assignments", await buildReveal(sessionId));
  return NextResponse.json({ ok: true });
}
