/* eslint-disable @next/next/no-img-element */

const PARTNERS = [
  { src: "/brand/partner-dcpl.png", alt: "DC Public Library" },
  { src: "/brand/partner-levy.png", alt: "Levy Strategic Design" },
  { src: "/brand/partner-superbloom.png", alt: "Superbloom Design" },
];

// Ink footer: lockup, brand line, partner rail (white knockouts), legal line.
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <img src="/brand/logo-lockup-light.png" alt="The Upskilling Labs" />
        </div>
        <p className="footer-brandline">
          A commons for upskilling — learn by doing, in the open. Projects,
          playbooks, and lessons, built like open source.
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
