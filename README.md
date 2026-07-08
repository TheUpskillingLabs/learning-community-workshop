# Open Learning Community — Workshop App

Companion app for The Upskilling Labs workshop **"Building an Open Learning
Community"** at the Digital Navigators Summit. It runs the live touchpoints:
three-field intake, AI-assisted grouping into tables of 3–4, a big-screen table
reveal, per-table six-box worksheets, and a big-screen showcase.

- **Stack:** Next.js (App Router) on Vercel · Supabase (Postgres + Realtime
  Broadcast) · one server-side Claude call for clustering.
- **Auth:** none for attendees (anonymous, join via QR/link) · facilitator
  `/admin` gated by a shared password.

See [`docs/app-architecture.md`](docs/app-architecture.md) for the full design
and the security model.

## Screens

| Route | Who | What |
| --- | --- | --- |
| `/join` | attendees (phones) | three-field intake form |
| `/table` → `/table/[id]` | one per table | the six-box worksheet |
| `/reveal` | projector | live table assignments |
| `/showcase` | projector | the six-box slide for the selected table |
| `/admin` | facilitator | create session, QR, live count, **Cluster now**, hand-edit tables, pick showcase |

## Setup — hook up Supabase + Vercel

### 1. Create a **new, dedicated** Supabase project

Use a fresh project (not a shared one) — this app takes anonymous public input
and is disposable after the event. In the Supabase dashboard:

1. **New project.** Note the project URL.
2. **SQL editor** → paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the tables and enables Row Level Security with **no anon
   policies** — all access is server-side via the secret key.
3. **Project Settings → API keys.** Copy the **publishable** key
   (`sb_publishable_…`) and the **secret** key (`sb_secret_…`). (On a project
   that still uses legacy keys, the `anon` and `service_role` JWTs work too —
   just put anon in the publishable slot and service_role in the secret slot.)
4. Before go-live, run **Advisors → Security** and confirm there are no
   "RLS disabled in public" findings.

> **Realtime:** the big screens receive updates via server-sent **Broadcast**,
> which needs no extra setup — no tables are added to a publication.

### 2. Environment variables

Copy `.env.example` to `.env.local` for local dev, and set the same keys in
Vercel (**Settings → Environment Variables**, Production + Preview):

| Var | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | **server only** | `sb_secret_…` |
| `ANTHROPIC_API_KEY` | server only | your Anthropic key |
| `ADMIN_PASSWORD` | server only | long random string (facilitator login) |
| `ADMIN_SESSION_SECRET` | server only | separate long random string (cookie signing) |
| `CLUSTER_MODEL` | server only | optional; defaults to `claude-opus-4-8` (`claude-sonnet-5` is a cheaper option) |

> `NEXT_PUBLIC_*` values are inlined at **build** time — after changing one in
> Vercel, **redeploy**.

### 3. Deploy to Vercel

1. **New Project → Import** this GitHub repo.
2. **Framework Preset: Next.js** (auto-detected). Leave Build Command and Output
   Directory on their defaults — do not override them.
3. Add the environment variables above **before** the first deploy.
4. Deploy.

### 4. Run the workshop

1. Open `/admin`, log in, and **Create a session** — this shows the join QR and
   link. Put the QR on the opening slide.
2. Open `/reveal` and `/showcase` on the projector (link buttons are on the
   admin panel).
3. Watch the live response count. When intake settles, click **Cluster now** —
   the reveal screen fills in. Nudge any grouping with the dropdowns.
4. Point one person per table at `/table`; they pick their table and fill the
   six boxes.
5. In **Showcase**, pick a table to put its six-box slide on the big screen.

### Operational notes

- A **new free-tier Supabase project auto-pauses after ~7 days idle** and has no
  uptime SLA. Warm it the day before *and* the morning of the event (open the
  app, create a throwaway session). For a business-critical live event, consider
  Supabase **Pro** for the event month, then downgrade.
- The clustering call can take ~20–60s with `claude-opus-4-8` on ~150 people.
  Vercel **Hobby caps function duration at 60s**; **Pro** allows up to 300s. If
  you see timeouts, use Pro or set `CLUSTER_MODEL=claude-sonnet-5`.
- **After the event:** rotate `ADMIN_PASSWORD` and the Supabase keys, or pause
  the project.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run typecheck            # tsc --noEmit
```

## Security model (short version)

- The **session UUID in the join link is a bearer capability**, not an
  isolation boundary — anyone with the link can participate in that session.
  Fine for a one-day disposable event.
- Attendees never touch the database directly. **All reads and writes go through
  server Route Handlers** using the secret key, which sanitize + length-clamp
  input and rate-limit. RLS is deny-by-default so the publishable key can't
  reach the tables even if the policies were wrong.
- Raw intake free-text is **never** sent to the browser; the reveal screen shows
  only display handles + table numbers. `is_showcased` is server-only, so no
  attendee can push themselves onto the projector.
- The in-memory rate limiter is a per-instance backstop only. For a hardened
  backstop add a Vercel WAF / `@vercel/firewall` rate-limit rule on the write
  routes (tuned generously — a room shares NAT IPs).
- Render everything as plain text (no `dangerouslySetInnerHTML`) and keep a
  human moderation beat before free text hits the projector.
