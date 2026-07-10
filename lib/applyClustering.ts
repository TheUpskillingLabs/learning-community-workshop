import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { buildReveal } from "./reveal";
import { broadcast, revealTopic } from "./supabase/broadcast";
import type { Group } from "./cluster";

// Re-cluster is destructive: drop the old tables (cascades away old six-box
// rows and nulls intake_responses.table_id) then write fresh ones from
// `groups`, and push the result to the reveal screen. Shared by the
// automated (AI-called) and manual (pasted-CSV) clustering routes.
export async function applyClustering(sessionId: string, groups: Group[]): Promise<void> {
  const admin = supabaseAdmin();
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
    if (tblErr || !tbl) throw new Error("Could not save tables.");
    if (g.ids.length > 0) {
      await admin
        .from("intake_responses")
        .update({ table_id: tbl.id })
        .eq("session_id", sessionId)
        .in("participant_id", g.ids);
    }
  }

  const reveal = await buildReveal(sessionId);
  await broadcast(revealTopic(sessionId), "assignments", reveal);
}
