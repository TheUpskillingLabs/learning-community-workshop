import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Return the current (most recent) session with its join URL + QR, so the
// admin panel can show them after a page reload.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = await activeSessionId();
  if (!id) return NextResponse.json({ id: null });

  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  const session = data as { id: string; name: string } | null;
  if (!session) return NextResponse.json({ id: null });

  const origin = new URL(req.url).origin;
  const joinUrl = `${origin}/join?session=${session.id}`;
  const qr = await QRCode.toDataURL(joinUrl, { width: 320, margin: 2 });
  return NextResponse.json({ id: session.id, name: session.name, joinUrl, qr });
}

// Create a new session and return its join URL + a QR code data URL.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // name is optional
  }
  const name = clean(body.name, 120) || `Workshop ${new Date().toISOString().slice(0, 10)}`;

  const { data, error } = await supabaseAdmin()
    .from("sessions")
    .insert({ name })
    .select("id, name")
    .single();
  const session = data as { id: string; name: string } | null;
  if (error || !session) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const joinUrl = `${origin}/join?session=${session.id}`;
  const qr = await QRCode.toDataURL(joinUrl, { width: 320, margin: 2 });

  return NextResponse.json({ id: session.id, name: session.name, joinUrl, qr });
}
