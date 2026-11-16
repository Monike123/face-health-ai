import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { DEV_AUTH } from "@/lib/dev";

export default function Home() {
  return (
    <div className="fh-fade flex flex-1 flex-col">
      <div className="fh-hero-orb fh-rise" aria-hidden>
        <div className="fh-hero-core">
          <span className="text-[1.05rem] font-semibold tracking-[0.18em]">BPM</span>
        </div>
      </div>

      <h1
        className="fh-rise text-center font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] tracking-[-0.03em]"
        style={{ animationDelay: "0.08s" }}
      >
        Know your pulse
        <br />
        in thirty seconds
      </h1>

      <p
        className="fh-rise mx-auto mt-3 max-w-[22rem] text-center text-[0.95rem] leading-relaxed text-[var(--ink-soft)]"
        style={{ animationDelay: "0.14s" }}
      >
        Face the camera. Hold still. FaceHealth reads tiny colour shifts in your skin and
        estimates your heart rate — privately, on your device.
      </p>

      <div className="fh-rise mt-8 space-y-3" style={{ animationDelay: "0.22s" }}>
        {DEV_AUTH ? (
          <Link href="/scan" className="fh-btn fh-btn-primary w-full">
            Start your scan
          </Link>
        ) : (
          <>
            <Show when="signed-out">
              <Link href="/sign-up" className="fh-btn fh-btn-primary w-full">
                Get started free
              </Link>
              <Link href="/sign-in" className="fh-btn fh-btn-ghost w-full">
                I already have an account
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/scan" className="fh-btn fh-btn-primary w-full">
                Start your scan
              </Link>
            </Show>
          </>
        )}
      </div>

      <ul
        className="fh-rise mt-8 space-y-2.5 text-[0.82rem] text-[var(--ink-soft)]"
        style={{ animationDelay: "0.3s" }}
      >
        <li className="flex gap-2">
          <span className="text-[var(--accent)]">01</span>
          Even light, face centred, stay still
        </li>
        <li className="flex gap-2">
          <span className="text-[var(--accent)]">02</span>
          Video never leaves your phone
        </li>
        <li className="flex gap-2">
          <span className="text-[var(--accent)]">03</span>
          Estimate only — not a medical reading
        </li>
      </ul>
    </div>
  );
}
