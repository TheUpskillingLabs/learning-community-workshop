import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">Workshop companion</div>
      <h1>Building an open learning community</h1>
      <p className="lead">
        You&apos;re in the room to design a learning cycle with people who serve
        learners like yours. Join here, then watch the screen for your table.
      </p>

      <div className="card">
        <h2>Joining us today?</h2>
        <p className="muted">
          Scan the QR code on the screen, or tap below to answer three quick
          questions.
        </p>
        <Link className="btn cta-primary" href="/join">
          Join the workshop
        </Link>
      </div>

      {/* Facilitator controls — intentionally quiet, below the fold of intent. */}
      <div className="host-links">
        <span className="eyebrow">Running the room</span>
        <div className="host-row">
          <Link href="/admin">Admin panel</Link>
          <Link href="/reveal">Reveal screen</Link>
          <Link href="/showcase">Showcase screen</Link>
          <Link href="/table">Table worksheets</Link>
        </div>
        <p className="help">
          Open Reveal and Showcase on the projector; drive everything else from
          Admin.
        </p>
      </div>
    </main>
  );
}
