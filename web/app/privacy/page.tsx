import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="fh-prose fh-fade">
      <p className="fh-kicker">Privacy</p>
      <h1 className="fh-title" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}>
        How FaceHealth AI handles your data
      </h1>
      <p>
        FaceHealth AI is a wellness tool, not a medical device. It estimates heart rate from
        tiny colour changes in your face. Video frames never leave your browser.
      </p>
      <h2>What we process</h2>
      <ul>
        <li>
          <strong>On your device:</strong> camera frames, face landmarks, and region colour
          averages.
        </li>
        <li>
          <strong>On our servers:</strong> only the colour-average time series needed to
          estimate heart rate for that scan. We do not store frames or face images.
        </li>
      </ul>
      <h2>Optional feedback</h2>
      <p>
        After a scan you can rate accuracy and experience, and optionally share an anonymous
        colour-signal trace to help us improve. Feedback is stored in a Postgres database
        (Neon). We do not store IP addresses or account identifiers with feedback.
      </p>
      <h2>Retention</h2>
      <p>Feedback records are kept for up to 12 months, then deleted.</p>
      <h2>Contact</h2>
      <p>
        Privacy questions: open an issue on{" "}
        <a
          href="https://github.com/Monike123/face-health-ai/issues"
          target="_blank"
          rel="noreferrer"
        >
          GitHub Issues
        </a>
        .
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/" className="fh-btn fh-btn-ghost">
          Back home
        </Link>
      </p>
    </article>
  );
}
