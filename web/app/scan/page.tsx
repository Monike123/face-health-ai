"use client";

import { useAuth } from "@clerk/nextjs";
import { DEV_AUTH } from "@/lib/dev";
import ScanClient from "./ScanClient";

function ScanWithClerk() {
  const { getToken } = useAuth();
  return <ScanClient getToken={getToken} />;
}

export default function ScanPage() {
  if (DEV_AUTH) return <ScanClient getToken={async () => null} />;
  return <ScanWithClerk />;
}
