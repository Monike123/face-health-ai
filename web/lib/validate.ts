/** Shared request validation for scan + feedback routes. */

export type ScanBody = { t_ms: number[]; rgb: number[][] };

export function validateScan(body: {
  t_ms?: unknown;
  rgb?: unknown;
}): ScanBody | string {
  if (!Array.isArray(body.t_ms) || !Array.isArray(body.rgb)) return "t_ms and rgb required";
  const t_ms = body.t_ms as number[];
  const rgb = body.rgb as number[][];
  if (t_ms.length !== rgb.length) return "t_ms and rgb must have the same length";
  if (t_ms.length < 240 || t_ms.length > 2700) return "sample count out of range";
  for (let i = 0; i < t_ms.length; i++) {
    if (typeof t_ms[i] !== "number" || !Number.isFinite(t_ms[i])) return "t_ms must be finite";
  }
  for (let i = 1; i < t_ms.length; i++) {
    if (!(t_ms[i] > t_ms[i - 1])) return "t_ms must be strictly increasing";
  }
  const span = (t_ms[t_ms.length - 1] - t_ms[0]) / 1000;
  if (span < 20 || span > 45) return "scan must last 20-45 s";
  if (t_ms.length / span < 8) return "frame rate below 8 fps";
  for (const row of rgb) {
    if (!Array.isArray(row) || row.length !== 3) return "rgb rows must be [R,G,B]";
    for (const v of row) {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 255) {
        return "rgb values must be finite and in [0, 255]";
      }
    }
  }
  return { t_ms, rgb };
}

export type FeedbackBody = {
  scan_id: string;
  hr_bpm: number | null;
  hr_lo: number | null;
  hr_hi: number | null;
  confidence: number;
  confidence_label: string;
  sqi: number;
  accuracy: "accurate" | "slightly_off" | "way_off" | "not_sure";
  experience: number;
  reference_bpm: number | null;
  reference_device: string | null;
  comment: string | null;
  trace_consent: boolean;
  trace: { t_ms: number[]; rgb: number[][] } | null;
  device_class: string;
  app_version: string;
};

const ACCURACY = new Set(["accurate", "slightly_off", "way_off", "not_sure"]);

export function validateFeedback(body: Record<string, unknown>): FeedbackBody | string {
  const scan_id = body.scan_id;
  if (typeof scan_id !== "string" || scan_id.length < 8 || scan_id.length > 64)
    return "scan_id invalid";
  const accuracy = body.accuracy;
  if (typeof accuracy !== "string" || !ACCURACY.has(accuracy)) return "accuracy invalid";
  const experience = body.experience;
  if (typeof experience !== "number" || !Number.isInteger(experience) || experience < 1 || experience > 5)
    return "experience must be 1-5";
  const confidence = body.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 100)
    return "confidence invalid";
  const sqi = body.sqi;
  if (typeof sqi !== "number" || !Number.isFinite(sqi) || sqi < 0 || sqi > 1) return "sqi invalid";

  let hr_bpm: number | null = null;
  if (body.hr_bpm !== null && body.hr_bpm !== undefined) {
    if (typeof body.hr_bpm !== "number" || !Number.isFinite(body.hr_bpm) || body.hr_bpm < 30 || body.hr_bpm > 220)
      return "hr_bpm invalid";
    hr_bpm = body.hr_bpm;
  }

  let hr_lo: number | null = null;
  let hr_hi: number | null = null;
  if (body.hr_lo !== null && body.hr_lo !== undefined) {
    if (typeof body.hr_lo !== "number" || !Number.isFinite(body.hr_lo)) return "hr_lo invalid";
    hr_lo = body.hr_lo;
  }
  if (body.hr_hi !== null && body.hr_hi !== undefined) {
    if (typeof body.hr_hi !== "number" || !Number.isFinite(body.hr_hi)) return "hr_hi invalid";
    hr_hi = body.hr_hi;
  }

  let reference_bpm: number | null = null;
  if (body.reference_bpm !== null && body.reference_bpm !== undefined && body.reference_bpm !== "") {
    if (typeof body.reference_bpm !== "number" || body.reference_bpm < 30 || body.reference_bpm > 220)
      return "reference_bpm invalid";
    reference_bpm = body.reference_bpm;
  }

  let reference_device: string | null = null;
  if (typeof body.reference_device === "string" && body.reference_device.trim()) {
    reference_device = body.reference_device.trim().slice(0, 80);
  }

  let comment: string | null = null;
  if (typeof body.comment === "string" && body.comment.trim()) {
    comment = body.comment.trim().slice(0, 500);
  }

  const trace_consent = Boolean(body.trace_consent);
  let trace: FeedbackBody["trace"] = null;
  if (trace_consent && body.trace && typeof body.trace === "object") {
    const tr = body.trace as { t_ms?: unknown; rgb?: unknown };
    const checked = validateScan({
      t_ms: tr.t_ms,
      rgb: tr.rgb,
    });
    // Opt-in traces may be shorter windows — allow via soft check of arrays only
    if (typeof checked === "string") {
      if (!Array.isArray(tr.t_ms) || !Array.isArray(tr.rgb) || tr.t_ms.length !== tr.rgb.length)
        return "trace invalid";
      if (tr.t_ms.length > 2700) return "trace too long";
      trace = { t_ms: tr.t_ms as number[], rgb: tr.rgb as number[][] };
    } else {
      trace = checked;
    }
  }

  const confidence_label =
    typeof body.confidence_label === "string" ? body.confidence_label.slice(0, 32) : "unknown";
  const device_class =
    typeof body.device_class === "string" ? body.device_class.slice(0, 32) : "unknown";
  const app_version =
    typeof body.app_version === "string" ? body.app_version.slice(0, 32) : "0.2.0";

  return {
    scan_id,
    hr_bpm,
    hr_lo,
    hr_hi,
    confidence,
    confidence_label,
    sqi,
    accuracy: accuracy as FeedbackBody["accuracy"],
    experience,
    reference_bpm,
    reference_device,
    comment,
    trace_consent,
    trace,
    device_class,
    app_version,
  };
}
