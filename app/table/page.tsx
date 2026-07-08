"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TableSummary } from "@/lib/types";

export default function TablePicker() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const explicit = new URLSearchParams(window.location.search).get("session");
    const url = explicit
      ? `/api/public/tables?session=${encodeURIComponent(explicit)}`
      : "/api/public/tables";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setTables(d.tables ?? []))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="wrap">
      <div className="eyebrow">Table worksheet</div>
      <h1>Find your table</h1>
      <p className="lead">
        One person per table: pick your table below to open your group&apos;s
        six-box worksheet.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : tables.length === 0 ? (
        <div className="notice">Tables haven&apos;t been assigned yet.</div>
      ) : (
        <div className="grid">
          {tables.map((t) => (
            <Link key={t.id} className="btn secondary" href={`/table/${t.id}`}>
              <strong>{t.code}</strong> — {t.label}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
