"use client";

import { useAuth } from "@clerk/nextjs";
import ScanClient from "./ScanClient";

/** Only mount this when ClerkProvider is present (USE_CLERK). */
export default function ScanAuthed() {
  const { getToken } = useAuth();
  return <ScanClient getToken={getToken} />;
}
