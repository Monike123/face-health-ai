"use client";

import Link from "next/link";
import { USE_CLERK } from "@/lib/dev";
import HeaderAuth from "./HeaderAuth";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fh-shell">
      <header className="fh-header">
        <Link href="/" className="fh-brand">
          FaceHealth<em>Beta</em>
        </Link>
        {USE_CLERK ? (
          <HeaderAuth />
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Local demo</span>
        )}
      </header>
      <main className="fh-main">{children}</main>
      <footer className="fh-footer">
        FaceHealth AI is a wellness tool, not a medical device. Do not use it for diagnosis or
        treatment decisions.
      </footer>
    </div>
  );
}
