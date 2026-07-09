import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import type {
  RevealPayload,
  ShowcasePayload,
  ShowcaseBoxes,
  MePayload,
  Presentation,
  KeepGoing,
} from "./types";

const LABS_URL = "https://theupskillinglabs.org";

// The session's end-of-day "keep going" links. slack_url / community_keeper may
// not exist until migration 0002 is applied — a failed select degrades to
// labs-only rather than erroring.
export async function buildKeep(sessionId: string): Promise<KeepGoing> {
  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("slack_url, community_keeper")
    .eq("id", sessionId)
    .maybeSingle();
  const row = data as { slack_url: string | null; community_keeper: string | null } | null;
  return {
    labsUrl: LABS_URL,
    slackUrl: row?.slack_url ?? null,
    keeper: row?.community_keeper ?? null,
  };
}

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

// The participant's own status, keyed by their localStorage participant_id:
// whether their intake is logged, their table assignment once it lands, their
// tablemates' answers, and the end-of-day "keep going" links. This is what
// powers the per-phone journey (so a participant sees their assignment without
// watching the projector).
export async function buildMe(
  sessionId: string,
  participantId: string
): Promise<MePayload> {
  const admin = supabaseAdmin();
  const keep = await buildKeep(sessionId);

  const { data: meData } = await admin
    .from("intake_responses")
    .select("handle, goal_text, table_id")
    .eq("session_id", sessionId)
    .eq("participant_id", participantId)
    .maybeSingle();
  const me = meData as
    | { handle: string; goal_text: string; table_id: string | null }
    | null;

  if (!me) {
    return { logged: false, handle: "", goalText: "", table: null, tablemates: [], keep };
  }

  let table: MePayload["table"] = null;
  let tablemates: MePayload["tablemates"] = [];

  if (me.table_id) {
    const { data: tblData } = await admin
      .from("tables")
      .select("id, code, label")
      .eq("id", me.table_id)
      .maybeSingle();
    table = (tblData as MePayload["table"]) ?? null;

    const { data: matesData } = await admin
      .from("intake_responses")
      .select("participant_id, handle, persona_text, skill_gap_text, goal_text")
      .eq("session_id", sessionId)
      .eq("table_id", me.table_id)
      .order("created_at", { ascending: true });
    const mates = (matesData ?? []) as {
      participant_id: string;
      handle: string;
      persona_text: string;
      skill_gap_text: string;
      goal_text: string;
    }[];
    tablemates = mates.map((m) => ({
      handle: m.handle,
      persona_text: m.persona_text,
      skill_gap_text: m.skill_gap_text,
      goal_text: m.goal_text,
      self: m.participant_id === participantId,
    }));
  }

  return { logged: true, handle: me.handle, goalText: me.goal_text, table, tablemates, keep };
}

// Every table's six-box, for the participant-browsable "all presentations"
// page (distinct from the facilitator's one-at-a-time /showcase).
export async function buildPresentations(sessionId: string): Promise<Presentation[]> {
  const admin = supabaseAdmin();

  const { data: tablesData } = await admin
    .from("tables")
    .select("id, code, label")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const tables = (tablesData ?? []) as { id: string; code: string; label: string }[];
  if (tables.length === 0) return [];

  const { data: subsData } = await admin
    .from("six_box_submissions")
    .select(
      "table_id, persona, pain_point, intervention, safe_space, proof_point, ongoing_support"
    )
    .eq("session_id", sessionId);
  const subs = (subsData ?? []) as ({ table_id: string } & ShowcaseBoxes)[];

  const byTable = new Map<string, ShowcaseBoxes>();
  for (const s of subs) {
    const { table_id, ...boxes } = s;
    byTable.set(table_id, boxes);
  }
  const empty: ShowcaseBoxes = {
    persona: "",
    pain_point: "",
    intervention: "",
    safe_space: "",
    proof_point: "",
    ongoing_support: "",
  };

  return tables.map((t) => ({
    code: t.code,
    label: t.label,
    boxes: byTable.get(t.id) ?? empty,
  }));
}
