"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INTAKE_FIELDS, MAX_FIELD_LEN } from "@/lib/constants";
import { getParticipantId, saveSession } from "@/lib/participant";

export default function JoinPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const explicit = new URLSearchParams(window.location.search).get("session");
    const url = explicit
      ? `/api/public/session?session=${encodeURIComponent(explicit)}`
      : "/api/public/session";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.id ?? null);
        setSessionName(d.name ?? "");
        saveSession(d.id ?? null);
      })
      .catch(() => setSessionId(null))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          participant_id: getParticipantId(),
          handle,
          ...values,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("idle");
        return;
      }
      setStatus("done");
      // Anchor this device to the session they joined, then land on the hub.
      saveSession(sessionId);
      router.push(`/me?session=${encodeURIComponent(sessionId)}`);
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

  if (!sessionId) {
    return (
      <main className="wrap">
        <div className="eyebrow eyebrow-teal">Join</div>
        <h1>No open session yet</h1>
        <p className="lead">
          The facilitator hasn&apos;t opened a session yet, or this link has
          expired. Hang tight and re-scan the QR code when it appears on the
          screen.
        </p>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="wrap">
        <div className="eyebrow eyebrow-teal">You&apos;re in</div>
        <h1>Thanks, {handle || "friend"}.</h1>
        <p className="lead">
          Your answers are saved. Taking you to your table…
        </p>
        <p style={{ marginTop: 12 }}>
          <Link className="btn" href={`/me?session=${sessionId ?? ""}`}>
            Go to your table
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">
        {sessionName || "Open Learning Community Workshop"}
      </div>
      <h1>Tell us three things</h1>
      <p className="lead">
        This is how we&apos;ll group you with people working on similar
        challenges.
      </p>

      <form onSubmit={submit} className="card">
        <label htmlFor="handle">Your name or a handle</label>
        <span className="help">Shown on the table-assignment screen.</span>
        <input
          id="handle"
          type="text"
          value={handle}
          maxLength={40}
          required
          onChange={(e) => setHandle(e.target.value)}
          placeholder="e.g. Sam R."
        />

        {INTAKE_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key}>{f.label}</label>
            <textarea
              id={f.key}
              maxLength={MAX_FIELD_LEN}
              required
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
            />
          </div>
        ))}

        {error && <div className="notice err">{error}</div>}

        <p style={{ marginTop: 24 }}>
          <button
            type="submit"
            className="cta-primary"
            disabled={status === "saving"}
          >
            {status === "saving" ? "Submitting…" : "Submit"}
          </button>
        </p>
      </form>
    </main>
  );
}
