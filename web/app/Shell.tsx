"use client";

import Link from "next/link";
import { USE_CLERK } from "@/lib/dev";
import HeaderAuth from "./HeaderAuth";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fh-shell">
      <header className="fh-header">
        <Link href="/" className="fh-brand">
          FaceHealth<span>Beta</span>
        </Link>
        {USE_CLERK ? (
          <HeaderAuth />
        ) : (
          <span className="text-xs font-medium text-[var(--ink-soft)]">Demo</span>
        )}
      </header>
      <main className="fh-main">{children}</main>
      <footer className="fh-footer">
        Wellness tool only — not a medical device. Do not use for diagnosis or treatment.
      </footer>
    </div>
  );
}
