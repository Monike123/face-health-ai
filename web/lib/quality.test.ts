import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessQuality, canStartScan, resetQualityState } from "./quality";

describe("assessQuality", () => {
  it("fails without landmarks", () => {
    resetQualityState();
    const q = assessQuality({
      landmarks: null,
      fusedRgb: null,
      regionRgb: {},
      frame: null,
      sampleW: 192,
      sampleH: 144,
      now: 0,
    });
    assert.equal(q.face, false);
    assert.equal(canStartScan(q, false), false);
  });

  it("passes framing for centred face-like mesh", () => {
    resetQualityState();
    const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    // spread a bbox ~40% wide
    for (let i = 0; i < 478; i++) {
      lm[i] = {
        x: 0.3 + (i % 10) * 0.04,
        y: 0.25 + Math.floor(i / 40) * 0.04,
      };
    }
    lm[1] = { x: 0.5, y: 0.5 };
    const q = assessQuality({
      landmarks: lm,
      fusedRgb: [120, 100, 80],
      regionRgb: {
        forehead: [120, 100, 80],
        left_malar: [118, 98, 78],
        right_malar: [122, 102, 82],
      },
      frame: null,
      sampleW: 192,
      sampleH: 144,
      now: 1000,
    });
    assert.equal(q.face, true);
    assert.equal(q.lighting, true);
  });
});
