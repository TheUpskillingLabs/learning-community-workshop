import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { clusterAttendees, type IntakeRow } from "@/lib/cluster";
import { buildReveal } from "@/lib/reveal";
import { broadcast, revealTopic } from "@/lib/supabase/broadcast";

// The one long-running route: it makes the Claude call. Node runtime is
// required (SDK + secret key). maxDuration is capped by your Vercel plan —
// 60s on Hobby, up to 300s on Pro. Opus + adaptive thinking on ~150 rows can
// approach 60s, so prefer Pro for the live event, or set CLUSTER_MODEL to
// claude-sonnet-5.
export const runtime = "nodejs";
export const maxDuration = 60;

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
  if (!sessionId) return NextResponse.json({ error: "missing session" }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: rowsData } = await admin
    .from("intake_responses")
    .select("participant_id, handle, persona_text, skill_gap_text, goal_text")
    .eq("session_id", sessionId);
  const rows = (rowsData ?? []) as IntakeRow[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No intake responses yet." }, { status: 400 });
  }

  // Model call + validate + repair (never returns an invalid clustering).
  let groups;
  try {
    groups = await clusterAttendees(rows);
  } catch {
    return NextResponse.json({ error: "Clustering failed. Try again." }, { status: 502 });
  }

  // Re-cluster is destructive: drop the old tables (this cascades away old
  // six-box rows and nulls intake_responses.table_id) then write fresh ones.
  await admin.from("tables").delete().eq("session_id", sessionId);

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const code = `T${i + 1}`;
    const { data: tblData, error: tblErr } = await admin
      .from("tables")
      .insert({ session_id: sessionId, label: g.label, code, ai_rationale: g.rationale })
      .select("id")
      .single();
    const tbl = tblData as { id: string } | null;
    if (tblErr || !tbl) {
      return NextResponse.json({ error: "Could not save tables." }, { status: 500 });
    }
    if (g.ids.length > 0) {
      await admin
        .from("intake_responses")
        .update({ table_id: tbl.id })
        .eq("session_id", sessionId)
        .in("participant_id", g.ids);
    }
  }

  // Push curated assignments to the reveal screen.
  const reveal = await buildReveal(sessionId);
  await broadcast(revealTopic(sessionId), "assignments", reveal);

  return NextResponse.json({ ok: true, tables: groups.length });
}
