import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";
import type { TableSummary } from "@/lib/types";

export const runtime = "nodejs";

// List the tables for a session (for the /table picker). Non-PII: code + label.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const sessionId = await resolveSessionId(explicit);
  if (!sessionId) return NextResponse.json({ tables: [] });

  const { data } = await supabaseAdmin()
    .from("tables")
    .select("id, code, label")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const tables = (data ?? []) as TableSummary[];
  return NextResponse.json({ tables });
}
