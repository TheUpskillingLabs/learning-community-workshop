// Client-only helpers for the participant's device-local identity + session.
// The participant_id and the joined session id are both persisted in
// localStorage so a participant stays anchored to their own session across
// screens and refreshes, even if the facilitator later opens a new session.

const PID_KEY = "olc_participant_id";
const SID_KEY = "olc_session_id";

export function getParticipantId(): string {
  let id = localStorage.getItem(PID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}

export function getSavedSession(): string | null {
  try {
    return localStorage.getItem(SID_KEY);
  } catch {
    return null;
  }
}

export function saveSession(id: string | null | undefined): void {
  if (!id) return;
  try {
    localStorage.setItem(SID_KEY, id);
  } catch {
    // ignore (private mode / storage disabled)
  }
}

// Which session a participant page should use: an explicit ?session= wins (and
// is remembered), otherwise the one saved on this device. Returns null when
// neither is known, so callers fall back to the server's "active" session.
export function resolveClientSession(): string | null {
  try {
    const explicit = new URLSearchParams(window.location.search).get("session");
    if (explicit) {
      saveSession(explicit);
      return explicit;
    }
    return getSavedSession();
  } catch {
    return null;
  }
}

// Append the saved session to an in-app path so navigation stays anchored even
// if localStorage is later cleared on the destination screen.
export function withSession(path: string): string {
  const id = getSavedSession();
  if (!id) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}session=${encodeURIComponent(id)}`;
}
