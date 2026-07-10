import Link from "next/link";

// Session materials, hosted on Google Drive (view-only). Update the links here
// when the documents change.
const RESOURCES = [
  {
    label: "Slides",
    href: "https://drive.google.com/file/d/16gD1FwWUMdK30v6ggW9i0mZ5HrRHOpU-/view?usp=drive_link",
  },
  {
    label: "Learning Cycle worksheet",
    href: "https://drive.google.com/file/d/1ZMuiz_PYLlpqNMfLVWy1AyFowfszSUnJ/view?usp=drive_link",
  },
  {
    label: "Self-Determination Theory reference sheet",
    href: "https://drive.google.com/file/d/1l4FnEFiPzT8ekNUcjWONgizaUaXS8FIS/view?usp=drive_link",
  },
  {
    label: "Diagnosing the Challenge reference sheet",
    href: "https://drive.google.com/file/d/1O2mZh5ZC1cJRnFdvjMHBMU4ySPwDcJ7i/view?usp=drive_link",
  },
];

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
          <a href="https://theupskillinglabs.org">Join The Labs →</a>
        </p>
      </div>

      <div className="card">
        <div className="eyebrow eyebrow-teal">Resources</div>
        <h2>Slides &amp; worksheets</h2>
        <p className="muted">
          The session materials. Open on your phone or laptop to follow along.
        </p>
        <ul className="resource-list">
          {RESOURCES.map((r) => (
            <li key={r.href}>
              <a href={r.href} target="_blank" rel="noreferrer">
                {r.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
