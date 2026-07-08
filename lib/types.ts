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
