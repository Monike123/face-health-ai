import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { DEV_AUTH } from "@/lib/dev";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FaceHealth AI",
  description: "Estimate your heart rate from a 30-second face scan. Wellness use only.",
  applicationName: "FaceHealth AI",
  appleWebApp: { capable: true, title: "FaceHealth AI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#eef5f3",
  viewportFit: "cover",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fh-shell">
      <header className="fh-header">
        <Link href="/" className="fh-brand">
          FaceHealth<span>Beta</span>
        </Link>
        {DEV_AUTH ? (
          <span className="text-xs font-medium text-[var(--ink-soft)]">Demo</span>
        ) : (
          <Show when="signed-in">
            <UserButton />
          </Show>
        )}
      </header>
      <main className="fh-main">{children}</main>
      <footer className="fh-footer">
        Wellness tool only — not a medical device. Do not use for diagnosis or treatment.
      </footer>
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full antialiased">
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
