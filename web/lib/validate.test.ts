import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateFeedback, validateScan } from "./validate";

function okPayload(n = 300, spanS = 30) {
  const t_ms = Array.from({ length: n }, (_, i) => (i * (spanS * 1000)) / (n - 1));
  const rgb = t_ms.map(() => [100, 110, 120]);
  return { t_ms, rgb };
}

describe("validateScan", () => {
  it("accepts valid 30s @10fps", () => {
    const r = validateScan(okPayload(300, 30));
    assert.equal(typeof r, "object");
  });

  it("rejects low fps", () => {
    const r = validateScan(okPayload(50, 30)); // ~1.7 fps
    assert.equal(typeof r, "string");
  });

  it("accepts slow mobile capture ~4 fps over 45s", () => {
    const r = validateScan(okPayload(180, 45));
    assert.equal(typeof r, "object");
  });

  it("accepts 90 samples over 30s (~3 fps)", () => {
    const r = validateScan(okPayload(90, 30));
    assert.equal(typeof r, "object");
  });

  it("accepts matching phase array", () => {
    const base = okPayload(90, 30);
    const phase = base.t_ms.map((_, i) => (i < 20 ? "R" : i < 40 ? "G" : i < 60 ? "B" : "W"));
    const r = validateScan({ ...base, phase });
    assert.equal(typeof r, "object");
    if (typeof r !== "string") assert.equal(r.phase?.length, 90);
  });

  it("rejects phase length mismatch", () => {
    const base = okPayload(90, 30);
    const r = validateScan({ ...base, phase: ["R", "G"] });
    assert.equal(typeof r, "string");
  });
});

describe("validateFeedback", () => {
  it("accepts minimal feedback", () => {
    const r = validateFeedback({
      scan_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      hr_bpm: 72,
      hr_lo: 68,
      hr_hi: 76,
      confidence: 80,
      confidence_label: "High",
      sqi: 0.7,
      accuracy: "accurate",
      experience: 5,
      reference_bpm: null,
      reference_device: null,
      comment: null,
      trace_consent: false,
      trace: null,
      device_class: "desktop",
      app_version: "0.2.0",
    });
    assert.equal(typeof r, "object");
  });
});
