# CLAUDE.md

Guide for AI agents working in this repo. For full setup + security see
[`README.md`](README.md); for the design rationale see
[`docs/app-architecture.md`](docs/app-architecture.md). This file is the short
operating manual — the map, the conventions, and the things that are easy to break.

## What this is

Companion app for **The Upskilling Labs' "Building an Open Learning Community" workshop**, run *at*
the DMV Digital Navigator Summit (hosted by DC Public Library — we don't host the summit). It runs
the live touchpoints: a 3-field intake, AI-assisted grouping into tables of 3–4, a projector table
reveal, per-table six-box worksheets, a projector showcase, and a participant "keep going" handoff.
One-day, disposable-after-the-event.

## Commands

```bash
npm run dev        # local dev at http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

**There is no test suite.** Verify a change with `npm run typecheck` + `npm run build`, then *render
the affected screen* (run the app / a Vercel preview and look at it) — don't assume it works.

## Architecture at a glance

Next.js 16 (App Router) on **Vercel** · **Supabase** (Postgres + Realtime Broadcast) · one server-side
**Claude** call for clustering. No attendee auth (anonymous, join by QR/link); `/admin` is gated by a
shared password.

Two Supabase clients — keep them straight:

- **`lib/supabase/admin.ts`** — the **secret** key (`SUPABASE_SECRET_KEY`), server-only, **bypasses
  RLS**. This is the *only* thing that reads or writes tables. Every API route uses it.
- **`lib/supabase/browser.ts`** — the **publishable** key, used **only** to *subscribe* to Realtime
  Broadcast on the projector screens. It never queries tables.

## Flows

- **Facilitator** (`/admin`, password-gated): create a session (→ join QR), watch the live count,
  **Cluster** (AI) or paste a CSV, hand-edit tables, pick the showcase table, set keep-going links.
- **Participant journey** (phones): `/join` (intake) → **`/me`** (live "my table" hub — assignment +
  tablemates once clustered) → `/table/[id]` (the table's shared six-box worksheet) → `/present`
  (browse every table's six-box) → keep-going (Register for The Labs + Join Slack).
- **Projector**: `/reveal` (assignments) and `/showcase` (one table's six-box), driven live via
  Broadcast.

## Invariants — do not break these

- **All DB access is server-side via the secret key.** Never query tables from the browser. The
  browser client only *subscribes* to Broadcast topics `reveal:<id>` / `showcase:<id>`
  (`lib/supabase/broadcast.ts`) — updates are **server-sent Broadcast, not `postgres_changes`**.
- **RLS is deny-by-default with no anon policies** (`0001_init.sql`). Never add an anon policy; never
  add a table to a realtime publication. The publishable key must never be able to reach a table.
- **Never send raw intake free-text to the browser** except to a participant's *own* table (`/me`).
  The projector `/reveal` shows display handles + table codes only. `is_showcased` is server-only.
- **Sanitize + length-clamp all input** with `clean()` (`lib/sanitize.ts`); **rate-limit writes**
  (`lib/ratelimit.ts`). Render everything as plain text — no `dangerouslySetInnerHTML`.
- **Migrations are applied by hand** in the Supabase SQL editor (no CLI, no auto-migrate). Keep them
  **additive + idempotent** (`add column if not exists`) and make reads **degrade gracefully** if a new
  column isn't applied yet — e.g. read new columns in a *separate* query that falls back to defaults on
  error (see `buildKeep` in `lib/reveal.ts` and `readLinks` in `app/api/admin/session/route.ts`).
- **`NEXT_PUBLIC_*` env vars are inlined at build time** → after changing one in Vercel you must
  **redeploy**.

## Design system (brand)

Plain CSS in **`app/globals.css`** — no Tailwind. The Upskilling Labs brand: **light-first** (warm
paper `#F6F4EF`), **teal** accent, self-hosted **Geologica** (`next/font/local`, `app/fonts/`), **one
14px radius** (`--r`, no pills), **no emoji**, **flush-left** type. Dark (ink) is reserved for the
nav, footer, and projector covers only. Reuse the existing classes (`.card`, `.btn` / `.btn-red` /
`.btn.secondary`, `.chip`, `.notice`, `.eyebrow` / `.eyebrow-teal`, `.idx`, `.lead`, `.help`,
`.status`, `.wrap`) rather than inventing new ones. Shared chrome (`SiteHeader`, `SiteFooter`,
`KeepGoing`) lives in `app/components/`.

## Participant identity & session

`lib/participant.ts` (client): a per-device **`olc_participant_id`** and the joined **`olc_session_id`**
in localStorage. Participant pages resolve the session as **URL `?session=` → saved-on-device → server
"active" (most recent)** (`resolveClientSession`; server side `lib/session.ts`). Keep onward links
anchored to the session (`withSession`) so a participant never drifts onto the wrong session.

## Data model

Four tables (`supabase/migrations/0001_init.sql`, `0002_journey.sql`): **`sessions`**, **`tables`**
(the pods), **`intake_responses`** (one per participant, `table_id` set on clustering), and
**`six_box_submissions`** (`unique(table_id)` — **one shared six-box per table**). Clustering:
`lib/cluster.ts` (one structured Claude call, `CLUSTER_MODEL` default `claude-opus-4-8`) →
`lib/applyClustering.ts` (destructive re-cluster: drop tables, reassign, Broadcast). Manual fallback:
`/api/admin/prompt` (copy a prompt for any AI chat) → paste the result into `/api/admin/import-tables`.

## File map

- **`lib/`** — `supabase/{admin,browser,broadcast}.ts` · `reveal.ts` (payload builders:
  `buildReveal`/`buildShowcase`/`buildMe`/`buildPresentations`/`buildKeep`) · `cluster.ts` +
  `applyClustering.ts` · `session.ts` · `participant.ts` · `admin.ts` (facilitator auth) ·
  `constants.ts` (six-box + intake fields) · `sanitize.ts` · `ratelimit.ts` · `types.ts`.
- **`app/api/public/*`** — unauthenticated: `join` (POST intake), `session`, `me`, `tables`,
  `presentations`, `reveal`, `showcase`.
- **`app/api/admin/*`** — password-gated: `login`/`logout`/`me`, `session` (GET/POST/PATCH), `state`,
  `cluster`, `import-tables`, `prompt`, `reassign`, `showcase`.
- **`app/api/table/[tableId]`** — GET/POST the shared six-box (public).
- **Pages** — `page` (landing), `join`, `me`, `table`/`table/[tableId]`, `present`, `reveal`,
  `showcase`, `admin`.

## Gotchas

- **supabase-js does not throw on Postgres errors** — it returns `{ data: null, error }`. The public
  GET routes intentionally ignore `error` and return empty, so **an empty render can hide a missing
  table/column**, not just "no rows." When something looks unlogged, verify the DB directly (Supabase
  table editor) rather than trusting an empty screen.
- The workshop's Supabase project is **not reachable from cloud agent sessions** (MCP is scoped to a
  different org). Test DB-backed changes on a **Vercel preview**, which carries the workshop DB env.
- **`POST /api/join` is unauthenticated** — handy for smoke-testing the write path against prod/preview.
- The six-box worksheet is **one shared doc per table** (not per participant). "See the table's shared
  responses" = that doc.

## Deploy

`main` auto-deploys to **Vercel production**; every PR gets a preview deployment (which uses the
workshop DB env). Env vars are documented in `README.md`. After a migration change, apply the SQL by
hand in the Supabase SQL editor before the feature relies on it.
