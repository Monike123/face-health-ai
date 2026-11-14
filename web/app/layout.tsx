import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { DEV_AUTH } from "@/lib/dev";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FaceHealth AI (Beta)",
  description: "Estimate your heart rate from a 30-second face scan. Wellness use only.",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="font-semibold">
          FaceHealth AI <span className="text-xs font-normal opacity-70">Beta</span>
        </Link>
        {DEV_AUTH ? (
          <span className="text-xs opacity-70">Local demo (no sign-in)</span>
        ) : (
          <Show when="signed-in">
            <UserButton />
          </Show>
        )}
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t px-6 py-3 text-center text-xs opacity-70">
        FaceHealth AI Beta is a wellness tool, not a medical device. It does not diagnose,
        treat, or prevent any condition.
      </footer>
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {DEV_AUTH ? (
          <Shell>{children}</Shell>
        ) : (
          <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
            <Shell>{children}</Shell>
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
