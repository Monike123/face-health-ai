"use client";

import Link from "next/link";
import { USE_CLERK } from "@/lib/dev";
import HeaderAuth from "./HeaderAuth";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fh-shell">
      <header className="fh-header">
        <Link href="/" className="fh-brand">
          FaceHealth AI
        </Link>
        <nav className="fh-nav">
          <Link href="/privacy" className="fh-nav-link">
            Privacy
          </Link>
          {USE_CLERK ? <HeaderAuth /> : null}
        </nav>
      </header>
      <main className="fh-main">{children}</main>
      <footer className="fh-footer">Wellness use only, not a medical device</footer>
    </div>
  );
}
