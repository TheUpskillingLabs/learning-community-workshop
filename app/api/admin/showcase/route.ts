import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { buildShowcase } from "@/lib/reveal";
import { broadcast, showcaseTopic } from "@/lib/supabase/broadcast";

export const runtime = "nodejs";

// Facilitator picks which table shows on the /showcase big screen (or clears
// it). is_showcased is a server-only field — it is never writable by anon, so
// participants cannot put themselves on screen.
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
  const tableId = body.table_id == null ? null : clean(body.table_id, 64);
  if (!sessionId) return NextResponse.json({ error: "missing session" }, { status: 400 });

  const admin = supabaseAdmin();

  // Clear any existing showcase for the session.
  await admin
    .from("six_box_submissions")
    .update({ is_showcased: false })
    .eq("session_id", sessionId)
    .eq("is_showcased", true);

  if (tableId) {
    // Ensure a submission row exists for this table, then flag it.
    const { data: tblData } = await admin
      .from("tables")
      .select("id, session_id")
      .eq("id", tableId)
      .eq("session_id", sessionId)
      .maybeSingle();
    const tbl = tblData as { id: string; session_id: string } | null;
    if (!tbl) return NextResponse.json({ error: "Unknown table" }, { status: 400 });

    await admin
      .from("six_box_submissions")
      .upsert(
        { table_id: tableId, session_id: sessionId, is_showcased: true },
        { onConflict: "table_id" }
      );
  }

  const payload = tableId ? await buildShowcase(sessionId) : null;
  await broadcast(showcaseTopic(sessionId), "show", payload);

  return NextResponse.json({ ok: true });
}
