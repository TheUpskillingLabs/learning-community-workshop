# Workshop App — Architecture Recommendation

Companion app for **"Building an Open Learning Community"** (Digital Navigator Summit), an 80-minute live session for ~50-150 attendees. This doc lays out the recommended stack and design; no code has been written yet.

## Decision summary

| Layer | Choice |
| --- | --- |
| Frontend + backend | Next.js (App Router), deployed on Vercel |
| Database + realtime | A **new, dedicated Supabase project** (not the existing OLOS project) |
| AI clustering | Server-side call to the Claude API, one-shot per session |
| Participant auth | None — anonymous join via QR/short link |
| Facilitator auth | Simple shared password gate on `/admin` |

Everything else in this doc justifies and details these five rows.

## Why Next.js + Vercel

The team already deploys on Vercel, so there's no new deploy pipeline to stand up. Next.js API routes (or Route Handlers) let the intake-write and clustering-trigger logic run server-side, which matters for two reasons: the Supabase service-role key and the `ANTHROPIC_API_KEY` must never reach the browser, and the AI clustering call needs to read every intake row for a session in one place before writing results back.

## Why a new Supabase project, not the shared OLOS one

- **Blast radius.** Intake is a publicly-writable, anonymous, no-login form — anyone with the QR link can insert rows. Putting that in the same project as OLOS's real data means one more surface to get RLS wrong on, for zero benefit.
- **Lifecycle mismatch.** This data is single-day and disposable (facilitator notes may want to keep the six-box outputs afterward, but the intake churn and session bookkeeping don't need to live in a production project long-term).
- **Cost/effort.** A new Supabase project on the same org takes minutes and is free at this scale (well under the free tier's row/row-read limits for ~150 attendees).

If reusing OLOS becomes a hard requirement later (e.g. wanting workshop data to feed into OLOS's existing reporting), migrate by dumping the `tables` (see below) into OLOS post-event rather than building live against it.

## Data model

```
sessions
  id (uuid, pk)
  name                text        -- e.g. "Digital Navigator Summit 2026-07-08"
  created_at          timestamptz

intake_responses
  id                  uuid pk
  session_id          uuid fk -> sessions
  participant_id      text        -- client-generated, stored in localStorage
  persona_text        text        -- "who they serve"
  skill_gap_text      text        -- "a skill their learners struggle with"
  goal_text           text        -- "what they want from today"
  table_id            uuid fk -> tables, nullable
  created_at          timestamptz

tables
  id                  uuid pk
  session_id          uuid fk -> sessions
  label               text        -- "Table 1"
  ai_rationale        text        -- why the model grouped these people (shown to facilitator, optional on-screen)
  created_at          timestamptz

six_box_submissions
  id                  uuid pk
  table_id            uuid fk -> tables (1:1 in practice, one worksheet per table)
  persona              text
  pain_point           text
  intervention         text
  safe_space           text
  proof_point          text
  ongoing_support      text
  is_showcased         boolean default false
  showcase_order       int nullable
  updated_at           timestamptz
```

RLS: `intake_responses` and `six_box_submissions` allow anonymous `insert`/`update` scoped to `session_id` (no cross-session reads/writes); all `select` for the public read-only screens (`/reveal`, `/showcase`) is scoped to the active `session_id` too. `/admin` writes (triggering clustering, editing `table_id`, picking showcase order) go through the server using the service-role key, gated by the password check in the route handler — not exposed as an open RLS policy.

## Screens / routes

- **`/join`** — the intake form (3 free-text fields). Mobile-first; reached via QR code shown on the opening slide. Generates and stores a `participant_id` in localStorage on first load so a refresh doesn't create a duplicate submission.
- **`/reveal`** — big-screen display of table assignments once clustering has run. Subscribes to Supabase Realtime on `tables`/`intake_responses` so it updates the instant the facilitator triggers clustering — no refresh needed.
- **`/table/[tableId]`** — the six-box worksheet entry form, one per table (facilitator can print/share the link, or QR-code it per-table). Submits into `six_box_submissions`.
- **`/showcase`** — big-screen slide viewer. Renders whichever `six_box_submissions` row the facilitator has marked "showcased," styled to match the deck's six-box slide layout. Realtime-subscribed so advancing to the next table on `/admin` flips the screen live.
- **`/admin`** — facilitator control room, password-gated:
  - live count of intake submissions as they arrive
  - "Cluster now" button → triggers the AI clustering route
  - editable list of `table_id` assignments (manual nudge if the AI grouping needs a fix)
  - pick which 3 tables show and in what order on `/showcase`

## Clustering flow (AI-assisted, free text)

1. Facilitator hits **"Cluster now"** on `/admin` (intended to happen a few minutes into the 15-minute presentation window, per the run-of-show).
2. A Route Handler reads all `intake_responses` for the session (at 150 rows, this comfortably fits in one prompt — no embeddings/vector DB needed at this scale).
3. It sends one Claude API call with a structured-output schema requesting: groups of 3-4 `participant_id`s, a short label per table, and a one-line rationale — clustered by shared persona/skill-gap similarity in the free text.
4. The route writes the result: creates `tables` rows, sets `intake_responses.table_id` for each participant.
5. Supabase Realtime pushes the change to `/reveal` automatically.

This keeps the "we want AI to help process free text" requirement without forcing attendees into picklists, and avoids building/tuning a bespoke clustering algorithm for a one-day event.

## Realtime wiring

Three Supabase Realtime channels, each scoped to `session_id`:
- `intake_responses` → drives the live submission counter on `/admin`
- `tables` (+ join on `intake_responses.table_id`) → drives `/reveal`
- `six_box_submissions` → drives `/showcase`

## Deployment notes

- New Supabase project, env vars in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client-safe), `SUPABASE_SERVICE_ROLE_KEY` (server-only), `ANTHROPIC_API_KEY` (server-only), `ADMIN_PASSWORD`.
- One `sessions` row per live event; `/join`'s QR code encodes `/join?session=<id>` (or a single active session is looked up by default if only one event runs at a time).
- Generate the QR code at build/runtime pointing at the deployed `/join` URL — any lightweight QR library works, no external service needed.

## Explicit non-goals (cut for time, v1)

- No participant accounts or cross-session history.
- No drag-and-drop manual re-clustering UI — the facilitator edits a row's `table_id` directly in the `/admin` list if the AI grouping needs a nudge.
- No persistence/reporting layer beyond what's in Supabase; if the six-box outputs need to feed OLOS later, export/copy after the event rather than building a live integration now.

## Touchpoint coverage check (against the facilitation guide)

| Guide reference | Covered by |
| --- | --- |
| "APP: three-field intake" (0:03-0:09) | `/join` |
| "Sandra forms tables... in parallel" (clustering) | AI clustering route, triggered from `/admin` |
| "Assignments go up" (reveal) | `/reveal` |
| "LIVE FROM OUR SESSION TOOL" — table assignments (slide 11) | `/reveal` |
| "Sharpen... load them into the app so they render as a slide" | `/table/[tableId]` → `six_box_submissions` |
| "LIVE FROM OUR SESSION TOOL" — six-box slide (slide 17) | `/showcase` |
| "Pick three groups" (showcase selection) | `/admin` showcase picker |
