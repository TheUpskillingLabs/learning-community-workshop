// Shared, non-secret types for the curated payloads sent to the big screens
// and returned by the public GET endpoints.

export type RevealMember = { handle: string };

export type RevealTable = {
  code: string;
  label: string;
  members: RevealMember[];
};

export type RevealPayload = {
  tables: RevealTable[];
};

export type ShowcaseBoxes = {
  persona: string;
  pain_point: string;
  intervention: string;
  safe_space: string;
  proof_point: string;
  ongoing_support: string;
};

export type ShowcasePayload = {
  code: string;
  label: string;
  boxes: ShowcaseBoxes;
} | null;

export type TableSummary = { id: string; code: string; label: string };

// --- participant "my table" hub -------------------------------------------
export type TablemateResponse = {
  handle: string;
  persona_text: string;
  skill_gap_text: string;
  goal_text: string;
  self: boolean;
};

export type MeTable = { id: string; code: string; label: string };

export type KeepGoing = {
  labsUrl: string;
  slackUrl: string | null;
  keeper: string | null;
};

export type MePayload = {
  logged: boolean;
  handle: string;
  goalText: string;
  table: MeTable | null;
  tablemates: TablemateResponse[];
  keep: KeepGoing;
};

// --- all presentations (participant self-browse) --------------------------
export type Presentation = { code: string; label: string; boxes: ShowcaseBoxes };
export type PresentationsPayload = { tables: Presentation[] };
