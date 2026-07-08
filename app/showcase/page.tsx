"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { SIX_BOXES } from "@/lib/constants";
import type { ShowcasePayload } from "@/lib/types";

export default function ShowcaseScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [show, setShow] = useState<ShowcasePayload>(null);

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

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/public/showcase?session=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => setShow(d.showcase ?? null))
      .catch(() => {});

    const sb = supabaseBrowser();
    const channel = sb
      .channel(`showcase:${sessionId}`)
      .on("broadcast", { event: "show" }, ({ payload }) => {
        setShow((payload ?? null) as ShowcasePayload);
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  if (!show) {
    return (
      <main className="screen">
        <div className="eyebrow">Showcase</div>
        <h1>Waiting for the next table</h1>
        <p className="lead">The facilitator will bring a worksheet up here.</p>
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="eyebrow">
        Showcase · {show.code} {show.label ? `· ${show.label}` : ""}
      </div>
      <h1>{show.label || "What they made"}</h1>
      <div className="six-grid">
        {SIX_BOXES.map((b) => (
          <div key={b.key} className="box">
            <div className="num">{b.num}</div>
            <div className="box-title">{b.title}</div>
            <div className="box-body">
              {show.boxes[b.key as keyof typeof show.boxes] || (
                <span className="muted">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
