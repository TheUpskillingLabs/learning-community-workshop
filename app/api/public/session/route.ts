import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Returns the session the public pages should use: the ?session=<id> param if
// given, else the most recent session. { id, name } or { id: null }.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const explicit = clean(url.searchParams.get("session"), 64) || null;
  const id = await resolveSessionId(explicit);
  if (!id) return NextResponse.json({ id: null });

  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  const session = data as { id: string; name: string } | null;
  if (!session) return NextResponse.json({ id: null });
  return NextResponse.json({ id: session.id, name: session.name });
}
