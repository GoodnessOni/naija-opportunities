import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/fraunces";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NaijaOpportunities", template: "%s | NaijaOpportunities" },
  description: "Scholarships, internships, jobs, and more, right at your doorstep.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="shell">
            <Link href="/" className="wordmark"><span aria-hidden="true" />NaijaOpportunities</Link>
          </div>
        </header>
        <main id="main" className="shell" tabIndex={-1}>{children}</main>
        <footer className="shell site-footer">An OGverse product <Link href="/submit">Submit an opportunity</Link></footer>
      </body>
    </html>
  );
}
