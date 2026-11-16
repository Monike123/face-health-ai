import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { hrFromTrace } from "./rppg";

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

  it("gates pure noise", () => {
    const { t_ms } = synth(72);
    const rgb = t_ms.map(() => [128, 128, 128]);
    const r = hrFromTrace(t_ms, rgb);
    assert.equal(r.hr_bpm, null);
    assert.equal(r.quality, "low");
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
