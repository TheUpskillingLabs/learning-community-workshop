import Link from "next/link";

export default function Home() {
  return (
    <main className="wrap">
      <div className="eyebrow eyebrow-teal">Digital Navigator Summit</div>
      <h1>Building an open learning community</h1>
      <p className="lead">
        The Upskilling Labs is a citizen R&amp;D community where people build real
        skills by doing real work with real people. Today we&apos;re hosting the
        Digital Navigator Summit in Washington DC.
      </p>

      <div className="card">
        <h2>Find your people. Build your edge.</h2>
        <p className="muted">
          The Labs isn&apos;t a class you sit through. It&apos;s where you
          practise becoming the person you want to be — on real problems, with
          people who notice.
        </p>
        <a
          className="btn btn-red cta-primary"
          href="https://theupskillinglabs.org"
        >
          Join The Labs
        </a>
        <p className="help" style={{ marginTop: 16 }}>
          Here for the summit? <Link href="/join">Start your intake →</Link>
        </p>
      </div>
    </main>
  );
}
