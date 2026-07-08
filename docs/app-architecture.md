# Workshop App — Architecture

Companion app for **"Building an Open Learning Community"** (Digital Navigators
Summit), an 80-minute live session for ~50–150 anonymous attendees. This
documents the design as built. Setup/run instructions are in the
[README](../README.md).

The design was validated against current Supabase / Next.js / Vercel / Claude
docs and an adversarial security review; the notes below fold in the
corrections that changed the original plan.

## Decision summary

| Layer | Choice |
| --- | --- |
| Frontend + backend | Next.js (App Router), deployed on Vercel |
| Database + realtime | A **new, dedicated Supabase project** (Postgres + Realtime **Broadcast**) |
| AI clustering | One server-side Claude call (`messages.parse` + structured output), validated & repaired in code |
| Participant auth | None — anonymous join via QR/link; `participant_id` in localStorage |
| Facilitator auth | Shared password checked server-side; signed httpOnly cookie |

## Why a new Supabase project (not the shared OLOS one)

Intake is anonymous, publicly-submitted, single-day, disposable data. Isolating
it in its own project bounds the blast radius and keeps RLS mistakes away from
production data. A fresh project is minutes of work on the same org.

## Security model (the load-bearing part)

**RLS cannot scope anonymous clients by session.** Every anonymous visitor
presents the *same* publishable key and the same `anon` role; there is no
per-client claim, and `auth.uid()` is `NULL`. So RLS can't enforce
"only my session." The design accounts for this rather than pretending it holds:

- **RLS is enabled on all four tables with _no anon policies_** → deny-by-default.
  The publishable key cannot read or write any table.
- **All reads and writes go through server Route Handlers** using the **secret
  key** (bypasses RLS). Those handlers sanitize, length-clamp, and rate-limit.
- The **session UUID in the join link is an unguessable bearer capability**, not
  a security boundary — anyone with the link can participate in that session.
  Acceptable for a one-day disposable event; documented, not overstated.
- **Raw intake free-text is never exposed to the browser.** The reveal screen
  receives only curated data (display handle → table number). This closes the
  leak where the public anon key could otherwise stream every attendee's answers.
- `is_showcased` / `showcase_order` are **server-only fields** set only from the
  admin routes, so no attendee can push themselves onto the projector.

## Realtime: server-sent Broadcast (not `postgres_changes`)

The big screens update via **Realtime Broadcast** on per-session topics
(`reveal:<id>`, `showcase:<id>`). After a state change, the server sends one
curated, non-PII payload on the topic; the big screens subscribe with the
publishable key and re-render. Chosen over `postgres_changes` because:

- `postgres_changes` honors RLS, and the SELECT policy needed to make it work
  would let any internet client stream raw intake text — a data leak.
- It avoids the per-subscriber fan-out burst when clustering writes ~150 rows.

Attendee phones do **not** subscribe to Realtime at all (only the projector
screens do), which also keeps the free-tier connection cap a non-issue. The
admin live count is a short server poll, not an anon subscription.

## Data model

```
sessions(id, name, created_at)

tables(id, session_id→sessions, label, code, ai_rationale, created_at)

intake_responses(id, session_id→sessions, participant_id, handle,
                 persona_text, skill_gap_text, goal_text,
                 table_id→tables (nullable), created_at,
                 UNIQUE(session_id, participant_id))

six_box_submissions(id, session_id→sessions,          -- denormalized for filtering
                    table_id→tables, UNIQUE(table_id), -- one worksheet per table (upsert)
                    persona, pain_point, intervention, safe_space,
                    proof_point, ongoing_support,
                    is_showcased, showcase_order,       -- server-only fields
                    updated_at)
```

Notes from review, baked in:
- `six_box_submissions.session_id` is **denormalized** so server queries filter
  by session without a join.
- `UNIQUE(table_id)` makes the worksheet an upsert target (concurrent submitters
  at one table don't create duplicate rows).
- `handle` was **added** — intake otherwise had no name, so an attendee couldn't
  recognize themselves on the reveal screen (raw persona text must not be shown).
- `participant_id` is client-generated and forgeable; it only de-dupes honest
  refreshes, it is not identity.

Migration: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

## Routes

**Pages** (`app/`): `/` (landing) · `/join` (intake) · `/table` (picker) →
`/table/[tableId]` (six-box worksheet) · `/reveal` (projector, Broadcast
subscriber) · `/showcase` (projector, Broadcast subscriber) · `/admin`
(facilitator panel).

**API** (`app/api/`), all `runtime = "nodejs"`:
- `join` — sanitize + clamp + rate-limit → upsert intake.
- `table/[tableId]` — GET current six boxes; POST sanitize → upsert (six content
  columns only; never the showcase fields).
- `public/{session,tables,reveal,showcase}` — curated, non-PII GETs for page
  hydration.
- `admin/{login,logout,me,session,state,cluster,reassign,showcase}` — each
  admin mutation re-verifies the signed cookie server-side before using the
  secret key.

## Clustering flow

1. Facilitator clicks **Cluster now** (`POST /api/admin/cluster`).
2. The handler loads all intake rows for the session and makes **one**
   `client.messages.parse()` call:
   - model `claude-opus-4-8` (dateless id; `claude-sonnet-5` is a cheaper
     alternative via `CLUSTER_MODEL`),
   - `thinking: { type: "adaptive" }` (off by default on Opus 4.8; clustering is
     a reasoning task),
   - `output_config.format` via `zodOutputFormat` for guaranteed-shape JSON,
   - **no** `temperature` / `top_p` / `budget_tokens` (all 400 on Opus 4.8 /
     Sonnet 5).
3. **JSON Schema cannot enforce table size 3–4 or exactly-once coverage**, so
   `lib/cluster.ts` validates the result (set-equality of ids, size in [3,4])
   and, on failure, does one repair-retry then a **deterministic repair**
   (split oversize, place orphans into the smallest table, dissolve undersize).
   An invalid clustering is never surfaced.
4. Old tables are dropped, fresh tables + assignments are written with the
   secret key, and a curated payload is broadcast to `reveal:<id>`.
5. Model output is treated as untrusted (prompt-injection defense): every id is
   verified against the session, and labels/rationale are length-clamped.

The facilitator's hand-edit (`/api/admin/reassign`) is the safety valve for the
non-deterministic grouping; late arrivals land in "unassigned" for manual
placement. Cost is ~$0.22/call on Opus 4.8 (~$0.09 on Sonnet 5).

## Runtime / deployment notes

- The cluster route sets `maxDuration = 60`. Vercel **Hobby caps at 60s**; on
  ~150 people Opus + adaptive thinking can approach that — prefer **Pro** (up to
  300s) for the live event, or `CLUSTER_MODEL=claude-sonnet-5`.
- A new free-tier Supabase project **auto-pauses after ~7 days idle** — warm it
  before the event.
- Env vars, key rotation, and Advisors check: see the README.

## Input safety / abuse

- Server-side per-field length clamp (~300 chars) + control/zero-width/RTL
  stripping (`lib/sanitize.ts`), applied before any persist.
- Per-session row cap and a coarse in-memory per-IP rate limiter
  (`lib/ratelimit.ts`) as a per-instance backstop — a Vercel WAF /
  `@vercel/firewall` rule is the production upgrade (tune generously; a room
  shares NAT IPs).
- All user/model text renders as **plain text** (no `dangerouslySetInnerHTML`,
  no markdown). Keep a facilitator moderation beat before free text hits the
  projector.

## Explicit non-goals (accepted risk, one-day event)

- No participant accounts; clearing localStorage/cookies mints a new identity,
  so sock-puppet/duplicate submissions are best-effort-only.
- No cross-session history or reporting layer.
- Per-session isolation is only as strong as the secrecy of the join link.

## Touchpoint coverage (against the facilitation guide)

| Guide reference | Covered by |
| --- | --- |
| "APP: three-field intake" (0:03) | `/join` |
| "Sandra forms tables… in parallel" | AI clustering from `/admin` |
| "Assignments go up" / "LIVE FROM OUR SESSION TOOL" (slide 11) | `/reveal` |
| "load them into the app so they render as a slide" | `/table/[tableId]` |
| "LIVE FROM OUR SESSION TOOL" — six-box slide (slide 17) | `/showcase` |
| "Pick three groups" (showcase selection) | `/admin` showcase picker |
