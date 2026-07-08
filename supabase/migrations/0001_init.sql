-- ===========================================================================
-- Digital Navigator Summit — workshop companion app
-- Initial schema + Row Level Security.
--
-- SECURITY MODEL (read before editing):
--   * Every table has RLS ENABLED with NO anon policies -> deny-by-default.
--     A brand-new Supabase project exposes the `public` schema through the
--     publishable/anon key over PostgREST, so RLS-off would make these tables
--     world-readable/writable. Enabling RLS with no policy blocks the anon key
--     entirely.
--   * ALL reads and writes happen server-side through Next.js Route Handlers
--     using the SECRET (service_role) key, which bypasses RLS. The browser
--     never queries these tables directly.
--   * Live updates on the big screens use server-sent Realtime BROADCAST on
--     per-session topics (reveal:<id> / showcase:<id>), NOT postgres_changes,
--     so no table is added to the `supabase_realtime` publication and no anon
--     SELECT policy is needed. This also keeps raw intake free-text off the
--     wire — the anon key can never stream it.
--   * The session UUID is an unguessable bearer capability, not a security
--     boundary: anyone who has a session's join link can participate in it.
--     Acceptable for a one-day, disposable event.
--
-- Apply with the Supabase SQL editor, or `supabase db push` if you use the CLI.
-- ===========================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- --- sessions --------------------------------------------------------------
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- --- tables (the pods) ------------------------------------------------------
create table if not exists public.tables (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  label        text not null,
  code         text not null,            -- short human code, e.g. 'T1'
  ai_rationale text,
  created_at   timestamptz not null default now()
);
create index if not exists tables_session_idx on public.tables(session_id);

-- --- intake_responses -------------------------------------------------------
create table if not exists public.intake_responses (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  participant_id text not null,          -- client-generated (localStorage); forgeable
  handle         text not null,          -- display name shown on the reveal screen
  persona_text   text not null,          -- who you serve
  skill_gap_text text not null,          -- a skill your learners struggle with
  goal_text      text not null,          -- what you want from today
  table_id       uuid references public.tables(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (session_id, participant_id)    -- best-effort de-dupe of honest re-submits
);
create index if not exists intake_session_idx on public.intake_responses(session_id);
create index if not exists intake_table_idx on public.intake_responses(table_id);

-- --- six_box_submissions ----------------------------------------------------
create table if not exists public.six_box_submissions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade, -- denormalized
  table_id        uuid not null references public.tables(id) on delete cascade,
  persona         text not null default '',
  pain_point      text not null default '',
  intervention    text not null default '',
  safe_space      text not null default '',
  proof_point     text not null default '',
  ongoing_support text not null default '',
  is_showcased    boolean not null default false,  -- server-only field (admin selects)
  showcase_order  int,                             -- server-only field
  updated_at      timestamptz not null default now(),
  unique (table_id)                                -- one worksheet per table (upsert target)
);
create index if not exists sixbox_session_idx on public.six_box_submissions(session_id);

-- --- Row Level Security: enable everywhere, grant NO anon policies ----------
-- With RLS on and no policy, anon is denied all access. Every operation runs
-- server-side via the secret key (which bypasses RLS).
alter table public.sessions            enable row level security;
alter table public.tables              enable row level security;
alter table public.intake_responses    enable row level security;
alter table public.six_box_submissions enable row level security;

-- Belt-and-suspenders: revoke direct table grants from the anon/public roles.
revoke all on public.sessions            from anon, authenticated;
revoke all on public.tables              from anon, authenticated;
revoke all on public.intake_responses    from anon, authenticated;
revoke all on public.six_box_submissions from anon, authenticated;

-- NOTE: intentionally NOT adding any table to the supabase_realtime publication.
-- Live updates use server-sent Broadcast, not postgres_changes.
