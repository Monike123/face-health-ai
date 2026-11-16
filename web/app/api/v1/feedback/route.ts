import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { sendFeedbackEmail } from "@/lib/email";
import { validateFeedback } from "@/lib/validate";

export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON" }, { status: 422 });
  }
  const checked = validateFeedback(raw);
  if (typeof checked === "string") {
    return NextResponse.json({ detail: checked }, { status: 422 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO scan_feedback (
        scan_id, hr_bpm, hr_lo, hr_hi, confidence, confidence_label, sqi,
        accuracy, experience, reference_bpm, reference_device, comment,
        trace_consent, trace, device_class, app_version
      ) VALUES (
        ${checked.scan_id},
        ${checked.hr_bpm},
        ${checked.hr_lo},
        ${checked.hr_hi},
        ${checked.confidence},
        ${checked.confidence_label},
        ${checked.sqi},
        ${checked.accuracy},
        ${checked.experience},
        ${checked.reference_bpm},
        ${checked.reference_device},
        ${checked.comment},
        ${checked.trace_consent},
        ${checked.trace},
        ${checked.device_class},
        ${checked.app_version}
      )
    `;
  } catch (e) {
    console.error("feedback db insert failed", e);
    return NextResponse.json({ detail: "database unavailable" }, { status: 503 });
  }

  try {
    await sendFeedbackEmail(checked);
  } catch (e) {
    // Feedback already saved — do not fail the user.
    console.error("feedback email failed", e);
  }

  return NextResponse.json({ ok: true });
}
