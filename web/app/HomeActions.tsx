"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function HomeActions() {
  return (
    <>
      <Show when="signed-out">
        <Link href="/sign-up" className="fh-btn fh-btn-primary">
          Create account
        </Link>
        <Link href="/sign-in" className="fh-btn fh-btn-ghost">
          Sign in
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/scan" className="fh-btn fh-btn-primary">
          Start a 30-second scan
        </Link>
      </Show>
    </>
  );
}
