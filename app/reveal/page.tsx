"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { RevealPayload } from "@/lib/types";

export default function RevealScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [data, setData] = useState<RevealPayload>({ tables: [] });

  // Resolve which session to show.
  useEffect(() => {
    const explicit = new URLSearchParams(window.location.search).get("session");
    const url = explicit
      ? `/api/public/session?session=${encodeURIComponent(explicit)}`
      : "/api/public/session";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setSessionId(d.id ?? null))
      .catch(() => setSessionId(null));
  }, []);

  // Hydrate + subscribe to Broadcast once we know the session.
  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/public/reveal?session=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => setData(d as RevealPayload))
      .catch(() => {});

    const sb = supabaseBrowser();
    const channel = sb
      .channel(`reveal:${sessionId}`)
      .on("broadcast", { event: "assignments" }, ({ payload }) => {
        setData(payload as RevealPayload);
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <main className="screen">
      <div className="eyebrow">Table assignments</div>
      <h1>Find your table</h1>
      <p className="lead">
        You were grouped by who you serve and the skill your learners struggle
        with.
      </p>

      {data.tables.length === 0 ? (
        <div className="notice">Waiting for table assignments…</div>
      ) : (
        <div className="reveal-grid">
          {data.tables.map((t) => (
            <div key={t.code} className="table-card">
              <div className="code">{t.code}</div>
              <div className="label">{t.label}</div>
              <div className="members">
                {t.members.map((m, i) => (
                  <div key={i}>{m.handle}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
