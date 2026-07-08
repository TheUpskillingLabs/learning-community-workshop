"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SIX_BOXES, MAX_FIELD_LEN } from "@/lib/constants";

type Boxes = Record<string, string>;

export default function Worksheet({ tableId }: { tableId: string }) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [boxes, setBoxes] = useState<Boxes>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/table/${tableId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setLabel(d.label ?? "");
        setCode(d.code ?? "");
        setBoxes(d.boxes ?? {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tableId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/table/${tableId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(boxes),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        setStatus("idle");
        return;
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  }

  if (loading) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    );
  }
  if (notFound) {
    return (
      <main className="wrap">
        <div className="eyebrow eyebrow-teal">Worksheet</div>
        <h1>Table not found</h1>
        <p className="lead">
          This worksheet link doesn&apos;t match a table. Head back to the{" "}
          <a href="/table">table picker</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">
        {code} · {label}
      </div>
      <h1>Your six-box worksheet</h1>
      <p className="lead">
        Sketch your learning cycle. Don&apos;t skip the proof point or the
        ongoing-support box — those are the two people always rush.
      </p>

      <form onSubmit={save}>
        {SIX_BOXES.map((b) => (
          <div key={b.key} className="card">
            <label htmlFor={b.key} className="box-head">
              <span className="idx tabular-nums">{b.num}</span>
              <span className="box-title-text">{b.title}</span>
            </label>
            <span className="help">{b.help}</span>
            <textarea
              id={b.key}
              maxLength={MAX_FIELD_LEN}
              value={boxes[b.key] ?? ""}
              onChange={(e) =>
                setBoxes((v) => ({ ...v, [b.key]: e.target.value }))
              }
            />
          </div>
        ))}

        {error && <div className="notice err">{error}</div>}

        <div className="row" style={{ marginTop: 20 }}>
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save worksheet"}
          </button>
          {status === "saved" && (
            <span className="status active">Saved</span>
          )}
        </div>
        <p className="help" style={{ marginTop: 12 }}>
          Tip: save as you go. When the facilitator picks your table for the
          showcase, whatever is saved here appears on the big screen.
        </p>
      </form>
    </main>
  );
}
