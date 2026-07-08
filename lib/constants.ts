// Shared constants used by both server and client — no secrets here.

export const MAX_FIELD_LEN = 300;

// The six-field template, in the order it is filled and presented.
// `key` matches the column names on public.six_box_submissions.
export const SIX_BOXES = [
  { key: "persona", num: "01", title: "Persona(s)", help: "Who this is for, who they serve" },
  { key: "pain_point", num: "02", title: "Pain point / obstacle", help: "What is getting in the learner's way" },
  { key: "intervention", num: "03", title: "Intervention / new practice", help: "The new thing they would learn or do" },
  { key: "safe_space", num: "04", title: "Safe space to play & practice", help: "The group space where they experiment, no stakes" },
  { key: "proof_point", num: "05", title: "Public proof point", help: "How they show what they made" },
  { key: "ongoing_support", num: "06", title: "Ongoing support / communal space", help: "Where the community lives, during & after" },
] as const;

export type SixBoxKey = (typeof SIX_BOXES)[number]["key"];

export const SIX_BOX_KEYS = SIX_BOXES.map((b) => b.key) as SixBoxKey[];

// The three intake fields shown on /join.
export const INTAKE_FIELDS = [
  { key: "persona_text", label: "Who do you serve?", placeholder: "e.g. adult ESL learners at a public library" },
  { key: "skill_gap_text", label: "A skill your learners struggle with", placeholder: "e.g. using AI tools to draft cover letters" },
  { key: "goal_text", label: "What do you want from today?", placeholder: "e.g. one idea I can try Monday" },
] as const;
