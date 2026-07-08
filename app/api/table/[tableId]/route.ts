import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clean } from "@/lib/sanitize";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { SIX_BOX_KEYS } from "@/lib/constants";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ tableId: string }> };

// GET current six-box values so the worksheet form can hydrate.
export async function GET(_req: Request, ctx: Ctx) {
  const { tableId } = await ctx.params;
  const admin = supabaseAdmin();

  const { data: tblData } = await admin
    .from("tables")
    .select("id, code, label, session_id")
    .eq("id", tableId)
    .maybeSingle();
  const tbl = tblData as
    | { id: string; code: string; label: string; session_id: string }
    | null;
  if (!tbl) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  const { data: subData } = await admin
    .from("six_box_submissions")
    .select(SIX_BOX_KEYS.join(", "))
    .eq("table_id", tableId)
    .maybeSingle();
  const sub = (subData ?? {}) as Record<string, string>;

  const boxes: Record<string, string> = {};
  for (const k of SIX_BOX_KEYS) boxes[k] = sub[k] ?? "";

  return NextResponse.json({ code: tbl.code, label: tbl.label, boxes });
}

// POST upserts the six boxes for this table. Anon can only touch the six
// content columns here — is_showcased / showcase_order are never accepted.
export async function POST(req: Request, ctx: Ctx) {
  const { tableId } = await ctx.params;

  const rl = rateLimit(`table:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many saves, please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: tblData } = await admin
    .from("tables")
    .select("id, session_id")
    .eq("id", tableId)
    .maybeSingle();
  const tbl = tblData as { id: string; session_id: string } | null;
  if (!tbl) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  const row: Record<string, unknown> = {
    table_id: tableId,
    session_id: tbl.session_id,
    updated_at: new Date().toISOString(),
  };
  for (const k of SIX_BOX_KEYS) row[k] = clean(body[k]);

  const { error } = await admin
    .from("six_box_submissions")
    .upsert(row, { onConflict: "table_id" });
  if (error) {
    return NextResponse.json({ error: "Could not save the worksheet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
