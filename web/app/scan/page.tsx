"use client";

import { USE_CLERK } from "@/lib/dev";
import ScanClient from "./ScanClient";
import ScanAuthed from "./ScanAuthed";

export default function ScanPage() {
  if (!USE_CLERK) {
    return <ScanClient getToken={async () => null} />;
  }
  return <ScanAuthed />;
}
