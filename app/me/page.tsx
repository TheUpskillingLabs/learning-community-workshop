"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MePayload } from "@/lib/types";
import { KeepGoing } from "@/app/components/KeepGoing";

const PID_KEY = "olc_participant_id";

// The participant's personal hub, keyed by their localStorage participant_id.
// It polls until the facilitator assigns tables, then shows the table, the
// tablemates' answers, and the paths onward (worksheet, all presentations,
// keep-going). This is how a participant sees their assignment on their own
// phone instead of scanning the projector.
export default function MePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [noPid, setNoPid] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem(PID_KEY);
    if (!pid) {
      setNoPid(true);
      setLoading(false);
      return;
    }
    const explicit = new URLSearchParams(window.location.search).get("session");
    const url =
      `/api/public/me?participant_id=${encodeURIComponent(pid)}` +
      (explicit ? `&session=${encodeURIComponent(explicit)}` : "");

    let active = true;
    const load = () =>
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          if (active) setMe(d as MePayload);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    load();
    const t = setInterval(load, 4000); // keep it live through each phase
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  // No intake on this device (or not found for this session).
  if (noPid || (me && !me.logged)) {
    return (
      <main className="wrap">
        <div className="eyebrow eyebrow-teal">Your table</div>
        <h1>We couldn&apos;t find your intake</h1>
        <p className="lead">
          Start your intake on this device and your table will show up here
          automatically.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn" href="/join">
            Start your intake
          </Link>
        </p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const goalWorthEcho =
    me.goalText.trim().length > 0 && me.goalText.trim().split(/\s+/).length >= 2;

  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">Your table</div>

      {!me.table ? (
        <>
          <h1>You&apos;re in, {me.handle || "friend"}.</h1>
          {goalWorthEcho && (
            <p className="lead">
              You came here for: “{me.goalText}”. Hold onto that.
            </p>
          )}
          <div className="notice ok">
            Your answers are saved. Hang tight — the moment the facilitator groups
            everyone, your table appears here automatically.
          </div>
          <p className="help" style={{ marginTop: 12 }}>
            Keep this page open. <Link href="/join">Edit your answers</Link>
          </p>
        </>
      ) : (
        <>
          <h1>
            You&apos;re at {me.table.code}
          </h1>
          <p className="lead">
            {me.table.label}. Here&apos;s who you&apos;re working with and what
            they&apos;re here for.
          </p>

          <div className="grid">
            {me.tablemates.map((m, i) => (
              <div key={i} className="card">
                <strong>
                  {m.handle}
                  {m.self ? " (you)" : ""}
                </strong>
                <p className="help" style={{ marginTop: 8 }}>
                  <b>Serves:</b> {m.persona_text}
                </p>
                <p className="help">
                  <b>Challenge:</b> {m.skill_gap_text}
                </p>
                <p className="help">
                  <b>Wants today:</b> {m.goal_text}
                </p>
              </div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn" href={`/table/${me.table.id}`}>
              Open your table&apos;s worksheet
            </Link>
            <Link className="btn secondary" href="/present">
              See all presentations
            </Link>
          </div>

          <div style={{ marginTop: 28 }}>
            <KeepGoing keep={me.keep} />
          </div>
        </>
      )}
    </main>
  );
}
