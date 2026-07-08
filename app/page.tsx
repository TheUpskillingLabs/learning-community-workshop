import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <div className="eyebrow">The Upskilling Labs · Digital Navigators Summit</div>
      <h1>Building an Open Learning Community</h1>
      <p className="lead">
        The companion app for the workshop. Attendees join here; the facilitator
        runs the room from the admin panel; the big screens show table
        assignments and the showcase.
      </p>

      <div className="card">
        <h2>For attendees</h2>
        <p className="muted">Scan the QR code on screen, or:</p>
        <p>
          <Link className="btn" href="/join">
            Join the workshop →
          </Link>
        </p>
      </div>

      <div className="card">
        <h2>For the facilitator</h2>
        <div className="grid">
          <div className="row">
            <Link className="btn secondary" href="/admin">
              Admin panel
            </Link>
            <Link className="btn secondary" href="/reveal">
              Reveal screen
            </Link>
            <Link className="btn secondary" href="/showcase">
              Showcase screen
            </Link>
            <Link className="btn secondary" href="/table">
              Table worksheets
            </Link>
          </div>
          <p className="muted">
            Open <strong>Reveal</strong> and <strong>Showcase</strong> on the
            projector. Drive everything else from <strong>Admin</strong>.
          </p>
        </div>
      </div>
    </main>
  );
}
