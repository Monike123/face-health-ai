"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { USE_CLERK } from "@/lib/dev";
import Shell from "./Shell";

export default function Providers({ children }: { children: React.ReactNode }) {
  const body = <Shell>{children}</Shell>;
  if (!USE_CLERK) return body;
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {body}
    </ClerkProvider>
  );
}
