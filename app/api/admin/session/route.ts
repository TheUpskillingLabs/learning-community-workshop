import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeSessionId } from "@/lib/session";
import { clean } from "@/lib/sanitize";

export const runtime = "nodejs";

// Read the session's keep-going links separately, so a missing slack_url /
// community_keeper column (before migration 0002) degrades to null instead of
// breaking the whole session lookup.
async function readLinks(id: string) {
  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("slack_url, community_keeper")
    .eq("id", id)
    .maybeSingle();
  const row = data as { slack_url: string | null; community_keeper: string | null } | null;
  return {
    slack_url: row?.slack_url ?? null,
    community_keeper: row?.community_keeper ?? null,
  };
}

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
  const links = await readLinks(session.id);
  return NextResponse.json({ id: session.id, name: session.name, joinUrl, qr, ...links });
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

  return NextResponse.json({
    id: session.id,
    name: session.name,
    joinUrl,
    qr,
    slack_url: null,
    community_keeper: null,
  });
}

// Update the current session's keep-going links (Slack invite + the person
// keeping the community going). Requires migration 0002.
export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = await activeSessionId();
  if (!id) return NextResponse.json({ error: "No open session." }, { status: 404 });

  const slack_url = clean(body.slack_url, 300) || null;
  const community_keeper = clean(body.community_keeper, 80) || null;

  const { error } = await supabaseAdmin()
    .from("sessions")
    .update({ slack_url, community_keeper })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Could not save links. Has migration 0002 been applied?" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, slack_url, community_keeper });
}
