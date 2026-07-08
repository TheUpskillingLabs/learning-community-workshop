"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client using the PUBLISHABLE key. Used ONLY to subscribe
// the big-screen pages (/reveal, /showcase) to Realtime Broadcast topics.
// It never reads or writes tables directly — all data access is server-side.
let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return cached;
}
