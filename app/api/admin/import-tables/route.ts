import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { parseGroupsCsv, validate, repair } from "@/lib/cluster";
import { applyClustering } from "@/lib/applyClustering";

export const runtime = "nodejs";

// Manual counterpart to /api/admin/cluster: the facilitator pastes back the
// CSV an AI chat produced from the /api/admin/prompt roster, instead of this
// app calling Anthropic directly. Same validate()/repair() safety net, so a
// malformed or rule-breaking reply still lands on valid 3-4 person tables.
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
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!sessionId) return NextResponse.json({ error: "missing session" }, { status: 400 });
  if (!csv.trim()) return NextResponse.json({ error: "Paste the CSV reply first." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: rowsData } = await admin
    .from("intake_responses")
    .select("participant_id")
    .eq("session_id", sessionId);
  const allIds = ((rowsData ?? []) as { participant_id: string }[]).map((r) => r.participant_id);
  if (allIds.length === 0) {
    return NextResponse.json({ error: "No intake responses yet." }, { status: 400 });
  }

  let modelTables;
  try {
    modelTables = parseGroupsCsv(csv);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse that CSV." },
      { status: 400 }
    );
  }

  let groups = modelTables.map((t) => ({
    label: t.label,
    rationale: t.rationale,
    ids: t.participant_ids.filter((id) => allIds.includes(id)),
  }));
  if (validate(groups, allIds).length > 0) {
    groups = repair(modelTables, allIds);
  }

  try {
    await applyClustering(sessionId, groups);
  } catch {
    return NextResponse.json({ error: "Could not save tables." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tables: groups.length });
}
