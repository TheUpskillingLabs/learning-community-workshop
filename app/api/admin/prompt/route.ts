import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { buildManualPrompt, type IntakeRow } from "@/lib/cluster";

export const runtime = "nodejs";

// Builds a self-contained clustering prompt (workshop context + rules +
// roster) for a facilitator to paste into any AI chat by hand, as an
// alternative to the /api/admin/cluster route calling Anthropic directly.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const sessionId = clean(url.searchParams.get("session"), 64);
  if (!sessionId) return NextResponse.json({ error: "missing session" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("intake_responses")
    .select("participant_id, handle, persona_text, skill_gap_text, goal_text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as IntakeRow[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No intake responses yet." }, { status: 400 });
  }

  return NextResponse.json({ prompt: buildManualPrompt(rows) });
}
