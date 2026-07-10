/* eslint-disable @next/next/no-img-element */

const SITE = "https://theupskillinglabs.org";

const PARTNERS = [
  { src: "/brand/partner-levy.png", alt: "Levy Strategic Design" },
  { src: "/brand/partner-superbloom.png", alt: "Superbloom Design" },
];

// Ink footer: lockup (links to the site), brand line, site link, partner rail
// (white knockouts), legal line.
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <a
          className="footer-logo"
          href={SITE}
          target="_blank"
          rel="noreferrer"
          aria-label="The Upskilling Labs"
        >
          <img src="/brand/logo-lockup-light.png" alt="The Upskilling Labs" />
        </a>
        <p className="footer-brandline">
          A commons for upskilling — learn by doing, in the open. Projects,
          playbooks, and lessons, built like open source.
        </p>
        <p className="footer-site">
          <a href={SITE} target="_blank" rel="noreferrer">
            theupskillinglabs.org →
          </a>
        </p>
        <div className="footer-partners">
          {PARTNERS.map((p) => (
            <img key={p.src} src={p.src} alt={p.alt} />
          ))}
        </div>
        <p className="footer-legal">
          © 2026 The Upskilling Labs, Inc. · MIT code · CC BY 4.0 content · Built
          in the open.
        </p>
      </div>
    </footer>
  );
}
