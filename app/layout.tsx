import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import "./globals.css";

// Self-hosted brand typeface (no CDN). One typeface across the whole system.
const geologica = localFont({
  src: "./fonts/Geologica-VariableFont.ttf",
  variable: "--font-geologica",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Open Learning Community Workshop · The Upskilling Labs",
  description:
    "Companion app for The Upskilling Labs' Open Learning Community workshop at the DMV Digital Navigator Summit, hosted by DC Public Library.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00141b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geologica.variable}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
