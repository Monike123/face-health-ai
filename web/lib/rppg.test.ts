import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeScan, hrFromTrace, type FlashPhase } from "./rppg";

const root = dirname(fileURLToPath(import.meta.url));

function synth(
  hrBpm: number,
  seconds = 30,
  fs = 30,
  seed = 1,
  amp = 0.02,
  noise = 0,
) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
  const t_ms: number[] = [];
  const rgb: number[][] = [];
  for (let i = 0; i < seconds * fs; i++) {
    const t = (i * 1000) / fs + rnd() * 3;
    t_ms.push(t);
    const pulse = amp * Math.sin((2 * Math.PI * hrBpm * t) / 1000 / 60);
    rgb.push([
      120 + 0.3 * pulse * 255 + noise * rnd() * 2,
      140 + pulse * 255 + noise * rnd() * 2,
      100 + 0.4 * pulse * 255 + noise * rnd() * 2,
    ]);
  }
  for (let i = 1; i < t_ms.length; i++) {
    if (t_ms[i] <= t_ms[i - 1]) t_ms[i] = t_ms[i - 1] + 1;
  }
  return { t_ms, rgb };
}

function phaseSchedule(n: number): FlashPhase[] {
  const out: FlashPhase[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / n;
    if (f < 0.22) out.push("R");
    else if (f < 0.44) out.push("G");
    else if (f < 0.66) out.push("B");
    else out.push("W");
  }
  return out;
}

describe("hrFromTrace", () => {
  it("recovers ~72 BPM from synthetic POS-like RGB", () => {
    const { t_ms, rgb } = synth(72);
    const r = hrFromTrace(t_ms, rgb);
    assert.ok(r.hr_bpm !== null);
    assert.ok(Math.abs(r.hr_bpm! - 72) < 3);
    assert.ok(r.waveform.length > 10);
    assert.ok(r.sqi >= 0.45);
    assert.ok(["POS", "CHROM", "Green"].includes(r.method));
  });

  it("always publishes band BPM for flat RGB with Low confidence", () => {
    const { t_ms } = synth(72);
    const rgb = t_ms.map(() => [128, 128, 128]);
    const r = hrFromTrace(t_ms, rgb);
    assert.ok(r.hr_bpm !== null);
    assert.ok(r.hr_bpm! >= 45 && r.hr_bpm! <= 180);
    assert.equal(r.confidence_label, "Low");
    assert.equal(r.quality, "low");
    assert.ok(!r.message.includes("could not get a clear reading"));
  });

  it("always publishes band BPM for pure noise with Low confidence", () => {
    const { t_ms, rgb } = synth(72, 35, 30, 9, 0, 8);
    const r = hrFromTrace(t_ms, rgb);
    assert.ok(r.hr_bpm !== null);
    assert.ok(r.hr_bpm! >= 45 && r.hr_bpm! <= 180);
    assert.equal(r.confidence_label, "Low");
    assert.ok(r.hr_lo !== null && r.hr_hi !== null);
  });

  it("recovers HR from weak-amplitude mobile-like signal", () => {
    const { t_ms, rgb } = synth(72, 30, 30, 2, 0.002, 0.3);
    const r = hrFromTrace(t_ms, rgb);
    assert.ok(r.hr_bpm !== null, `expected HR, got null sqi=${r.sqi}`);
    assert.ok(Math.abs(r.hr_bpm! - 72) < 8);
  });

  it("matches golden fixture within 1.5 BPM when present", () => {
    const path = join(root, "__fixtures__", "golden.json");
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      return;
    }
    const g = JSON.parse(raw) as {
      t_ms: number[];
      rgb: number[][];
      hr_bpm: number;
    };
    const r = hrFromTrace(g.t_ms, g.rgb);
    assert.ok(r.hr_bpm !== null);
    assert.ok(Math.abs(r.hr_bpm! - g.hr_bpm) <= 1.5);
  });
});

describe("analyzeScan", () => {
  it("returns HR plus clamped vitals with R/G/B phases", () => {
    const { t_ms, rgb } = synth(72, 35);
    const phase = phaseSchedule(t_ms.length);
    const r = analyzeScan(t_ms, rgb, { phase });
    assert.ok(r.hr_bpm !== null);
    assert.ok(Math.abs(r.hr_bpm! - 72) < 3);
    assert.equal(r.flash_used, true);
    assert.ok(r.vitals.hr.value !== null);
    assert.ok(r.vitals.bp.value !== null && r.vitals.bp.value2 !== null);
    assert.ok(r.vitals.bp.value! >= 90 && r.vitals.bp.value! <= 160);
    assert.ok(r.vitals.bp.value2! >= 60 && r.vitals.bp.value2! <= 100);
    assert.ok(["Low", "Medium"].includes(r.vitals.bp.confidence_label));
    if (r.vitals.spo2.value !== null) {
      assert.ok(r.vitals.spo2.value >= 85 && r.vitals.spo2.value <= 100);
      assert.equal(r.vitals.spo2.confidence_label, "Low");
    }
    assert.ok(r.vitals.temperature.value !== null);
    assert.ok(r.vitals.temperature.value! >= 35.5 && r.vitals.temperature.value! <= 37.5);
    assert.equal(r.vitals.temperature.confidence_label, "Low");
    assert.ok(r.disclaimer.includes("not a medical device"));
  });

  it("flat RGB still publishes HR; SpO2 may be unavailable", () => {
    const { t_ms } = synth(72, 35);
    const rgb = t_ms.map(() => [128, 128, 128]);
    const phase = phaseSchedule(t_ms.length);
    const r = analyzeScan(t_ms, rgb, { phase });
    assert.ok(r.hr_bpm !== null);
    assert.equal(r.vitals.hr.confidence_label, "Low");
    assert.ok(
      r.vitals.spo2.status === "unavailable" ||
        (r.vitals.spo2.value !== null && r.vitals.spo2.confidence_label === "Low"),
    );
  });
});
