import Link from "next/link";

// Ink nav bar with the white-knockout lockup. Dark is reserved for nav,
// footer, and covers.
export function SiteHeader() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo" aria-label="The Upskilling Labs — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-lockup-light.png" alt="The Upskilling Labs" />
        </Link>
        <span className="nav-context">Digital Navigators Summit</span>
      </div>
    </header>
  );
}
