import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import type { RevealPayload, ShowcasePayload } from "./types";

// Build the CURATED reveal payload for a session: table code/label + member
// display handles only. Raw persona/skill/goal text is never included, so this
// is safe to send to the public big screen.
export async function buildReveal(sessionId: string): Promise<RevealPayload> {
  const admin = supabaseAdmin();

  const { data: tablesData } = await admin
    .from("tables")
    .select("id, code, label")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const tables = (tablesData ?? []) as { id: string; code: string; label: string }[];
  if (tables.length === 0) return { tables: [] };

  const { data: membersData } = await admin
    .from("intake_responses")
    .select("handle, table_id")
    .eq("session_id", sessionId)
    .not("table_id", "is", null);
  const members = (membersData ?? []) as { handle: string; table_id: string | null }[];

  const byTable = new Map<string, { handle: string }[]>();
  for (const m of members) {
    if (!m.table_id) continue;
    const arr = byTable.get(m.table_id) ?? [];
    arr.push({ handle: m.handle });
    byTable.set(m.table_id, arr);
  }

  return {
    tables: tables.map((t) => ({
      code: t.code,
      label: t.label,
      members: byTable.get(t.id) ?? [],
    })),
  };
}

// Build the CURATED showcase payload: the six-box content the facilitator has
// selected. Returns null when nothing is currently showcased.
export async function buildShowcase(sessionId: string): Promise<ShowcasePayload> {
  const admin = supabaseAdmin();

  const { data: subData } = await admin
    .from("six_box_submissions")
    .select(
      "table_id, persona, pain_point, intervention, safe_space, proof_point, ongoing_support"
    )
    .eq("session_id", sessionId)
    .eq("is_showcased", true)
    .maybeSingle();
  const sub = subData as
    | {
        table_id: string;
        persona: string;
        pain_point: string;
        intervention: string;
        safe_space: string;
        proof_point: string;
        ongoing_support: string;
      }
    | null;
  if (!sub) return null;

  const { data: tblData } = await admin
    .from("tables")
    .select("code, label")
    .eq("id", sub.table_id)
    .maybeSingle();
  const tbl = tblData as { code: string; label: string } | null;

  return {
    code: tbl?.code ?? "",
    label: tbl?.label ?? "",
    boxes: {
      persona: sub.persona,
      pain_point: sub.pain_point,
      intervention: sub.intervention,
      safe_space: sub.safe_space,
      proof_point: sub.proof_point,
      ongoing_support: sub.ongoing_support,
    },
  };
}
