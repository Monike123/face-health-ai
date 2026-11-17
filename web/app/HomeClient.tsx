"use client";

import Link from "next/link";
import Image from "next/image";
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
            <span>No account required.</span>
          </li>
        </ul>
      </div>

      <aside className="fh-preview">
        <Image
          src="/face-guide.jpg"
          alt="Reference: face the camera with forehead and cheeks clearly lit"
          fill
          className="fh-preview-photo"
          sizes="(max-width: 900px) 100vw, 28rem"
          priority
        />
        <div className="fh-preview-oval" aria-hidden />
        <div className="fh-preview-caption">
          <span>Hold your face like this</span>
          <span>Wellness use only</span>
        </div>
      </aside>
    </section>
  );
}
