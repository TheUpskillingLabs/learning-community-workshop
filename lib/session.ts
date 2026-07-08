import "server-only";
import { supabaseAdmin } from "./supabase/admin";

// Resolve which session the public pages should use. For a single live event
// we default to the most recently created session, so the join QR and the big
// screens "just work" without threading a session id through every URL. A
// ?session=<id> query param always overrides this.
export async function activeSessionId(): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function resolveSessionId(
  explicit: string | null | undefined
): Promise<string | null> {
  if (explicit) return explicit;
  return activeSessionId();
}
