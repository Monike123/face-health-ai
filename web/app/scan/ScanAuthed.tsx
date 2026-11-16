"use client";

import { useAuth } from "@clerk/nextjs";
import ScanClient from "./ScanClient";

/** Only mount this when ClerkProvider is present (DEV_AUTH off). */
export default function ScanAuthed() {
  const { getToken } = useAuth();
  return <ScanClient getToken={getToken} />;
}
