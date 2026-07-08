import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Full facilitator view for /admin: intake count, tables with members and the
// AI rationale, unassigned participants, and which table is showcased. Polled
// by the admin panel. Admin-gated, so it may include raw intake text.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const sessionId = clean(url.searchParams.get("session"), 64);
  if (!sessionId) return NextResponse.json({ error: "missing session" }, { status: 400 });

  const admin = supabaseAdmin();

  const { count: responseCount } = await admin
    .from("intake_responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const { data: tablesData } = await admin
    .from("tables")
    .select("id, code, label, ai_rationale")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const tables = (tablesData ?? []) as {
    id: string;
    code: string;
    label: string;
    ai_rationale: string | null;
  }[];

  const { data: peopleData } = await admin
    .from("intake_responses")
    .select("id, handle, persona_text, skill_gap_text, table_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const people = (peopleData ?? []) as {
    id: string;
    handle: string;
    persona_text: string;
    skill_gap_text: string;
    table_id: string | null;
  }[];

  const { data: showcasedData } = await admin
    .from("six_box_submissions")
    .select("table_id")
    .eq("session_id", sessionId)
    .eq("is_showcased", true)
    .maybeSingle();
  const showcasedTableId = (showcasedData as { table_id: string } | null)?.table_id ?? null;

  const byTable = new Map<string, typeof people>();
  const unassigned: typeof people = [];
  for (const p of people) {
    if (p.table_id) {
      const arr = byTable.get(p.table_id) ?? [];
      arr.push(p);
      byTable.set(p.table_id, arr);
    } else {
      unassigned.push(p);
    }
  }

  return NextResponse.json({
    responseCount: responseCount ?? 0,
    showcasedTableId,
    tables: tables.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label,
      ai_rationale: t.ai_rationale ?? "",
      members: byTable.get(t.id) ?? [],
    })),
    unassigned,
  });
}
