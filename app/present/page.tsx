"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SIX_BOXES } from "@/lib/constants";
import type { PresentationsPayload, KeepGoing as KeepGoingData } from "@/lib/types";
import { KeepGoing } from "@/app/components/KeepGoing";

type Data = PresentationsPayload & { keep: KeepGoingData };

// Participant-browsable view of every table's six-box (distinct from the
// facilitator's one-at-a-time projector /showcase).
export default function PresentPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const explicit = new URLSearchParams(window.location.search).get("session");
    const url =
      "/api/public/presentations" +
      (explicit ? `?session=${encodeURIComponent(explicit)}` : "");
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d as Data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const tables = data?.tables ?? [];

  return (
    <main className="wrap wrap-wide">
      <div className="eyebrow eyebrow-teal">Showcase</div>
      <h1>What every table made</h1>
      <p className="lead">
        Browse each table&apos;s six-box. Yours is in here too.
      </p>
      <p className="help" style={{ marginTop: -4 }}>
        <Link href="/me">← Back to your table</Link>
      </p>

      {tables.length === 0 ? (
        <div className="notice">
          No presentations yet. Check back once tables have filled in their
          worksheets.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {tables.map((t, i) => (
            <div key={i} className="card">
              <h2>
                <span className="idx tabular-nums">{t.code}</span> {t.label}
              </h2>
              <div className="present-boxes">
                {SIX_BOXES.map((b) => (
                  <div key={b.key} className="present-box">
                    <div className="present-box-title">{b.title}</div>
                    <div className="present-box-body">
                      {t.boxes[b.key as keyof typeof t.boxes] || (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.keep && (
        <div style={{ marginTop: 28 }}>
          <KeepGoing keep={data.keep} />
        </div>
      )}
    </main>
  );
}
