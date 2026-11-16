"use client";

import { Show, UserButton } from "@clerk/nextjs";

/** Only mount when ClerkProvider is present (DEV_AUTH off). */
export default function HeaderAuth() {
  return (
    <Show when="signed-in">
      <UserButton />
    </Show>
  );
}
