-- ===========================================================================
-- 0002 — participant journey: session-level "keep going" links
--
-- ADDITIVE and IDEMPOTENT. Safe to run whether or not 0001 has been applied,
-- and safe to re-run. Nothing here changes existing rows or RLS — every table
-- keeps deny-by-default RLS from 0001; all reads/writes stay server-side via
-- the secret key.
-- ===========================================================================

-- The end-of-workshop handoff so a table's conversation keeps going: a Slack
-- invite link and the name of the person keeping the community going. Both
-- nullable; when unset, the matching CTA simply doesn't render.
alter table public.sessions
  add column if not exists slack_url text;
alter table public.sessions
  add column if not exists community_keeper text;
