import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default async function proxy(request: NextRequest) {
  if (!HAS_CLERK) return NextResponse.next();

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isProtected = createRouteMatcher(["/scan(.*)"]);
  const handler = clerkMiddleware(
    async (auth, req) => {
      if (isProtected(req)) await auth.protect();
    },
    { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
  );
  return handler(request, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
