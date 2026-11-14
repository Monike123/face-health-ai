import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV = process.env.NEXT_PUBLIC_DEV_AUTH === "1";

async function clerkProxy(request: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isProtected = createRouteMatcher(["/scan(.*)"]);
  const handler = clerkMiddleware(
    async (auth, req) => {
      if (isProtected(req)) await auth.protect();
    },
    { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
  );
  // clerkMiddleware returns a Next.js middleware function
  return handler(request, {} as never);
}

export default async function proxy(request: NextRequest) {
  if (DEV) return NextResponse.next();
  return clerkProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
