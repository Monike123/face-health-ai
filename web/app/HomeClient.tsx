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
          Sit at your laptop or hold your phone steady for 30 seconds. Tiny colour changes in
          your skin are turned into a pulse estimate. Video stays on your device.
        </p>

        <div className="fh-actions">
          {USE_CLERK ? (
            <HomeActions />
          ) : (
            <Link href="/scan" className="fh-btn fh-btn-primary">
              Start a 30-second scan
            </Link>
          )}
        </div>

        <ul className="fh-meta">
          <li>
            <strong>Light</strong>
            <span>Face a window or lamp. Avoid strong backlight.</span>
          </li>
          <li>
            <strong>Still</strong>
            <span>Keep your face in frame. Talking lowers signal quality.</span>
          </li>
          <li>
            <strong>Private</strong>
            <span>Only colour averages leave the browser. Nothing is stored.</span>
          </li>
        </ul>
      </div>

      <aside className="fh-preview" aria-hidden>
        <div className="fh-preview-grid" />
        <div className="fh-preview-face" />
        <div className="fh-preview-caption">
          <span>Webcam preview</span>
          <span>30s · POS · wellness only</span>
        </div>
      </aside>
    </section>
  );
}
