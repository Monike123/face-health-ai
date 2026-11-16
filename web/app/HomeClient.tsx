"use client";

import Link from "next/link";
import { USE_CLERK } from "@/lib/dev";
import HomeActions from "./HomeActions";

export default function HomeClient() {
  return (
    <section className="fh-home fh-fade">
      <div>
        <p className="fh-kicker">Contactless pulse check</p>
        <h1 className="fh-title">
          FaceHealth
          <br />
          estimates heart rate
          <br />
          from your webcam
        </h1>
        <p className="fh-lead">
          Sit at your laptop or hold your phone steady for about 30 seconds. Tiny colour changes
          in your skin become a pulse estimate with a confidence score. Video stays on your
          device.
        </p>

        <div className="fh-actions">
          {USE_CLERK ? (
            <HomeActions />
          ) : (
            <Link href="/scan" className="fh-btn fh-btn-primary">
              Start a scan
            </Link>
          )}
        </div>

        <h2 className="fh-kicker" style={{ marginTop: "1.75rem" }}>
          How it works
        </h2>
        <ol className="fh-steps">
          <li>
            <span>1</span>
            <div>
              <strong>Frame your face</strong>
              <span>Even light, face in the oval, glasses off if you can.</span>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Hold still ~30s</strong>
              <span>We sample forehead and cheek colour — not a video upload.</span>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>See BPM + confidence</strong>
              <span>Heart-rate estimate, likely range, and a short waveform.</span>
            </div>
          </li>
        </ol>

        <ul className="fh-meta">
          <li>
            <strong>Private</strong>
            <span>Frames never leave the browser. Optional feedback only.</span>
          </li>
          <li>
            <strong>Wellness only</strong>
            <span>Not a medical device. Do not use for diagnosis.</span>
          </li>
          <li>
            <strong>Open access</strong>
            <span>No account required for this preview.</span>
          </li>
        </ul>
      </div>

      <aside className="fh-preview" aria-hidden>
        <svg viewBox="0 0 320 400" className="fh-preview-svg" width="100%" height="100%">
          <rect width="320" height="400" fill="#12100e" />
          <ellipse cx="160" cy="190" rx="72" ry="100" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.7" />
          <path
            d="M70 300 C110 250, 210 250, 250 300"
            fill="none"
            stroke="#d7ebe1"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <text x="24" y="36" fill="rgba(243,239,231,0.7)" fontSize="12" fontFamily="sans-serif">
            Face guide
          </text>
          <text x="24" y="372" fill="rgba(243,239,231,0.55)" fontSize="11" fontFamily="sans-serif">
            ~30s · POS · wellness only
          </text>
        </svg>
      </aside>
    </section>
  );
}
