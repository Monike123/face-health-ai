import { Resend } from "resend";
import type { FeedbackBody } from "./validate";

const TO = "manassawant5913@gmail.com";

export async function sendFeedbackEmail(fb: FeedbackBody): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY missing — skipping feedback email");
    return;
  }
  const from = process.env.RESEND_FROM || "FaceHealth <onboarding@resend.dev>";
  const resend = new Resend(key);
  const bpm = fb.hr_bpm !== null ? `${Math.round(fb.hr_bpm)} BPM` : "no reading";
  const lines = [
    `scan_id: ${fb.scan_id}`,
    `estimate: ${bpm} (range ${fb.hr_lo ?? "—"}–${fb.hr_hi ?? "—"})`,
    `confidence: ${fb.confidence} (${fb.confidence_label})  sqi=${fb.sqi.toFixed(2)}`,
    `accuracy: ${fb.accuracy}`,
    `experience: ${fb.experience}/5`,
    `reference: ${fb.reference_bpm ?? "—"} (${fb.reference_device ?? "—"})`,
    `comment: ${fb.comment ?? "—"}`,
    `trace_consent: ${fb.trace_consent}`,
    `device: ${fb.device_class}  app: ${fb.app_version}`,
  ];
  const { error } = await resend.emails.send({
    from,
    to: TO,
    subject: `FaceHealth feedback · ${fb.accuracy} · ${bpm}`,
    text: lines.join("\n"),
  });
  if (error) throw new Error(error.message);
}
