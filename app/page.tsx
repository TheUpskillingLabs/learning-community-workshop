import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">DMV Digital Navigator Summit</div>
      <h1>Building an open learning community</h1>
      <p className="lead">
        The Upskilling Labs is an open learning community where people build
        real skills in emerging technologies by doing real work with real
        people. Today — Friday, July 10, 2026 — we&apos;re running our Open
        Learning Community workshop at the DMV Digital Navigator Summit, hosted
        by DC Public Library.
      </p>

      <div className="card">
        <p className="muted">
          Today is a working session. You&apos;ll join a small group, take a
          real challenge from your own programs, and sketch a way to meet it
          together. Your intake is how we group you, so start with who you
          serve and what your learners are working on.
        </p>
        <Link href="/join" className="btn btn-red cta-primary">
          Start Your Intake
        </Link>
        <p className="help" style={{ marginTop: 16 }}>
          <a
            href="https://theupskillinglabs.org"
            target="_blank"
            rel="noreferrer"
          >
            Join The Labs →
          </a>
        </p>
      </div>
    </main>
  );
}
