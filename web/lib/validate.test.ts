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
    const r = validateScan(okPayload(200, 30));
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
