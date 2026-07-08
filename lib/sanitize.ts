import { MAX_FIELD_LEN } from "./constants";

// Code-point ranges to strip so attacker-supplied text can't inject invisible
// payloads onto the big screen: C0/C1 controls + DEL, zero-width chars, and
// bidi/RTL override + isolate chars. Built by code point (not an inline regex)
// so the source file contains no invisible characters.
const STRIP_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f], // C0 controls
  [0x7f, 0x9f], // DEL + C1 controls
  [0x200b, 0x200f], // zero-width space..RLM
  [0x202a, 0x202e], // bidi embeddings / overrides
  [0x2066, 0x2069], // bidi isolates
];

function stripped(cp: number): boolean {
  for (const [lo, hi] of STRIP_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

// Sanitize + length-clamp any user- or model-supplied text on the server
// before it is persisted. Applied to every intake field and every six-box
// value. Rendered output is always plain text (never dangerouslySetInnerHTML).
export function clean(input: unknown, max = MAX_FIELD_LEN): string {
  const raw = String(input ?? "");
  let out = "";
  for (const ch of raw) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && !stripped(cp)) out += ch;
  }
  return out.trim().slice(0, max);
}
