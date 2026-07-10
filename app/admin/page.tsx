"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Person = {
  id: string;
  handle: string;
  persona_text: string;
  skill_gap_text: string;
  table_id: string | null;
};
type AdminTable = {
  id: string;
  code: string;
  label: string;
  ai_rationale: string;
  members: Person[];
};
type AdminState = {
  responseCount: number;
  showcasedTableId: string | null;
  tables: AdminTable[];
  unassigned: Person[];
};
type Session = {
  id: string;
  name: string;
  joinUrl: string;
  qr: string;
  slack_url: string | null;
  community_keeper: string | null;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AdminState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [slackDraft, setSlackDraft] = useState("");
  const [keeperDraft, setKeeperDraft] = useState("");
  const [promptText, setPromptText] = useState<string | null>(null);
  const [csvDraft, setCsvDraft] = useState("");

  // Seed the keep-going link drafts whenever the session loads/changes.
  useEffect(() => {
    setSlackDraft(session?.slack_url ?? "");
    setKeeperDraft(session?.community_keeper ?? "");
  }, [session]);

  const loadSession = useCallback(async () => {
    const r = await fetch("/api/admin/session");
    if (r.status === 401) {
      setAuthed(false);
      return null;
    }
    const d = await r.json();
    const s: Session | null = d.id ? d : null;
    setSession(s);
    return s;
  }, []);

  const loadState = useCallback(async (sid: string) => {
    const r = await fetch(`/api/admin/state?session=${encodeURIComponent(sid)}`);
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    if (r.ok) setState(await r.json());
  }, []);

  // Initial auth probe.
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authed))
      .catch(() => setAuthed(false));
  }, []);

  // Load session + state once authed.
  useEffect(() => {
    if (!authed) return;
    loadSession().then((s) => {
      if (s) loadState(s.id);
    });
  }, [authed, loadSession, loadState]);

  // Poll state every 3s.
  useEffect(() => {
    if (!authed || !session) return;
    const t = setInterval(() => loadState(session.id), 3000);
    return () => clearInterval(t);
  }, [authed, session, loadState]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      setPassword("");
      setAuthed(true);
    } else {
      const d = await r.json().catch(() => ({}));
      setLoginError(d.error ?? "Login failed.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setSession(null);
    setState(null);
  }

  async function createSession() {
    setBusy("session");
    setMsg(null);
    const r = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (r.ok) {
      const s = await r.json();
      setSession(s);
      setState(null);
      loadState(s.id);
    } else {
      setMsg("Could not create session.");
    }
    setBusy(null);
  }

  async function saveLinks() {
    if (!session) return;
    setBusy("links");
    setMsg(null);
    const r = await fetch("/api/admin/session", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slack_url: slackDraft, community_keeper: keeperDraft }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setSession((s) =>
        s ? { ...s, slack_url: d.slack_url ?? null, community_keeper: d.community_keeper ?? null } : s
      );
      setMsg("Saved the keep-going links.");
    } else {
      setMsg(d.error ?? "Could not save links.");
    }
    setBusy(null);
  }

  async function cluster() {
    if (!session) return;
    setBusy("cluster");
    setMsg(null);
    const r = await fetch("/api/admin/cluster", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: session.id }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Grouped into ${d.tables} tables.` : d.error ?? "Clustering failed.");
    if (r.ok) loadState(session.id);
    setBusy(null);
  }

  async function copyPrompt() {
    if (!session) return;
    setBusy("prompt");
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/prompt?session=${encodeURIComponent(session.id)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error ?? "Could not build the prompt.");
        return;
      }
      setPromptText(d.prompt);
      try {
        await navigator.clipboard.writeText(d.prompt);
        setMsg("Prompt copied — paste it into any AI chat.");
      } catch {
        setMsg("Couldn't copy automatically — expand the box below and copy by hand.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function importTables() {
    if (!session || !csvDraft.trim()) return;
    setBusy("import");
    setMsg(null);
    const r = await fetch("/api/admin/import-tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: session.id, csv: csvDraft }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Grouped into ${d.tables} tables.` : d.error ?? "Import failed.");
    if (r.ok) {
      setCsvDraft("");
      loadState(session.id);
    }
    setBusy(null);
  }

  async function reassign(intakeId: string, tableId: string | null) {
    if (!session) return;
    await fetch("/api/admin/reassign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: session.id, intake_id: intakeId, table_id: tableId }),
    });
    loadState(session.id);
  }

  async function showcase(tableId: string | null) {
    if (!session) return;
    await fetch("/api/admin/showcase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: session.id, table_id: tableId }),
    });
    loadState(session.id);
  }

  if (authed === null) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="wrap">
        <div className="eyebrow eyebrow-teal">Facilitator</div>
        <h1>Admin</h1>
        <form onSubmit={login} className="card">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {loginError && <div className="notice err">{loginError}</div>}
          <p style={{ marginTop: 16 }}>
            <button type="submit">Enter</button>
          </p>
        </form>
      </main>
    );
  }

  const tableOptions = state?.tables ?? [];

  return (
    <main className="wrap wrap-wide">
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div className="eyebrow eyebrow-teal">Facilitator · Admin</div>
        <button className="secondary btn-sm" onClick={logout}>
          Log out
        </button>
      </div>
      <h1>Run the room</h1>

      {msg && <div className="notice ok">{msg}</div>}

      {/* --- Session + join QR --- */}
      <div className="card">
        <h2>Session</h2>
        {!session ? (
          <>
            <p className="muted">No session yet.</p>
            <button onClick={createSession} disabled={busy === "session"}>
              {busy === "session" ? "Creating…" : "Create a session"}
            </button>
          </>
        ) : (
          <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.qr}
              alt="Join QR code"
              width={180}
              height={180}
              style={{ borderRadius: 14, background: "#fff", padding: 8 }}
            />
            <div>
              <div className="pill">{session.name}</div>
              <p style={{ marginTop: 10 }}>
                <strong>Join link</strong>
                <br />
                <a href={session.joinUrl}>{session.joinUrl}</a>
              </p>
              <div className="row">
                <a className="btn secondary" href="/reveal" target="_blank">
                  Open Reveal ↗
                </a>
                <a className="btn secondary" href="/showcase" target="_blank">
                  Open Showcase ↗
                </a>
              </div>
              <p className="help" style={{ marginTop: 12 }}>
                Creating another session starts fresh — the join QR points at the
                newest one.
              </p>
              <button
                className="secondary"
                onClick={createSession}
                disabled={busy === "session"}
                style={{ marginTop: 8 }}
              >
                New session
              </button>
            </div>
          </div>
        )}
      </div>

      {session && (
        <>
          {/* --- Keep-going links (participant handoff) --- */}
          <div className="card">
            <h2>Keep-going links</h2>
            <p className="muted">
              Shown to participants at the end, on their phones. (Requires the
              0002 migration on the workshop database.)
            </p>
            <label htmlFor="slack">Slack invite link</label>
            <input
              id="slack"
              type="text"
              value={slackDraft}
              onChange={(e) => setSlackDraft(e.target.value)}
              placeholder="https://join.slack.com/t/…"
            />
            <label htmlFor="keeper">Community keeper (name)</label>
            <input
              id="keeper"
              type="text"
              value={keeperDraft}
              onChange={(e) => setKeeperDraft(e.target.value)}
              placeholder="e.g. Sam"
            />
            <div className="row" style={{ marginTop: 16 }}>
              <button onClick={saveLinks} disabled={busy === "links"}>
                {busy === "links" ? "Saving…" : "Save links"}
              </button>
            </div>
          </div>

          {/* --- Intake + clustering --- */}
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Intake</h2>
              <span className="pill">
                {state?.responseCount ?? 0} responses
              </span>
            </div>
            <p className="muted">
              Wait until intake settles, then group everyone into tables of 3–4.
              Re-clustering rebuilds the tables from scratch.
            </p>
            <button onClick={cluster} disabled={busy === "cluster"}>
              {busy === "cluster" ? "Grouping…" : "Cluster now (AI, needs API key)"}
            </button>

            <p className="muted" style={{ marginTop: 20 }}>
              No API key wired up? Copy a ready-to-paste prompt into any AI
              chat (e.g. claude.ai), then paste its CSV reply back below.
            </p>
            <button onClick={copyPrompt} disabled={busy === "prompt"}>
              {busy === "prompt" ? "Building…" : "Copy clustering prompt"}
            </button>
            {promptText && (
              <details style={{ marginTop: 12 }}>
                <summary className="help">Show the prompt (copy by hand)</summary>
                <textarea
                  readOnly
                  value={promptText}
                  rows={10}
                  style={{ marginTop: 8 }}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </details>
            )}
            <label htmlFor="csvDraft" style={{ marginTop: 16, display: "block" }}>
              Paste the AI&apos;s CSV reply
            </label>
            <textarea
              id="csvDraft"
              rows={8}
              value={csvDraft}
              onChange={(e) => setCsvDraft(e.target.value)}
              placeholder="participant_id,table_code,table_label,rationale"
            />
            <div className="row" style={{ marginTop: 12 }}>
              <button
                onClick={importTables}
                disabled={busy === "import" || !csvDraft.trim()}
              >
                {busy === "import" ? "Importing…" : "Import tables"}
              </button>
            </div>
          </div>

          {/* --- Tables --- */}
          {tableOptions.length > 0 && (
            <div className="card">
              <h2>Tables</h2>
              <p className="muted">
                Sanity-check the AI grouping, nudge anyone with the dropdowns,
                and pick tables for the showcase.
              </p>
              <div className="grid">
                {tableOptions.map((t) => (
                  <div key={t.id} className="card" style={{ margin: 0 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <strong>
                          {t.code} — {t.label}
                        </strong>
                        {t.ai_rationale && (
                          <div className="help">{t.ai_rationale}</div>
                        )}
                      </div>
                      <button
                        className={
                          state?.showcasedTableId === t.id ? "" : "secondary"
                        }
                        onClick={() =>
                          showcase(state?.showcasedTableId === t.id ? null : t.id)
                        }
                      >
                        {state?.showcasedTableId === t.id
                          ? "On screen"
                          : "Showcase"}
                      </button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {t.members.map((m) => (
                        <div
                          key={m.id}
                          className="row"
                          style={{ justifyContent: "space-between", marginTop: 6 }}
                        >
                          <span>
                            {m.handle}{" "}
                            <span className="help">· {m.persona_text}</span>
                          </span>
                          <select
                            value={t.id}
                            onChange={(e) =>
                              reassign(
                                m.id,
                                e.target.value === "none" ? null : e.target.value
                              )
                            }
                          >
                            {tableOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.code}
                              </option>
                            ))}
                            <option value="none">Unassigned</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- Unassigned --- */}
          {state && state.unassigned.length > 0 && (
            <div className="card">
              <h2>Unassigned ({state.unassigned.length})</h2>
              <p className="muted">
                Late arrivals or people who joined after clustering. Drop them
                into a table.
              </p>
              {state.unassigned.map((m) => (
                <div
                  key={m.id}
                  className="row"
                  style={{ justifyContent: "space-between", marginTop: 6 }}
                >
                  <span>
                    {m.handle} <span className="help">· {m.persona_text}</span>
                  </span>
                  {tableOptions.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        e.target.value && reassign(m.id, e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Assign to…
                      </option>
                      {tableOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.code} — {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
