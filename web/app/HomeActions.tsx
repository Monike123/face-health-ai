"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";

/** Only mount when ClerkProvider is present (DEV_AUTH off). */
export default function HomeActions() {
  return (
    <>
      <Show when="signed-out">
        <Link href="/sign-up" className="fh-btn fh-btn-primary w-full">
          Get started free
        </Link>
        <Link href="/sign-in" className="fh-btn fh-btn-ghost w-full">
          I already have an account
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/scan" className="fh-btn fh-btn-primary w-full">
          Start your scan
        </Link>
      </Show>
    </>
  );
}
