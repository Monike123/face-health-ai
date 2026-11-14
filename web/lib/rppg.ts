/** Classical POS → bandpass → SQI → Welch HR (mirrors facehealth Python path). */

const FS = 30;
const HR_LO = 0.7;
const HR_HI = 3.0;
const SQI_GATE = 0.5;

function mean(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function std(xs: number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / xs.length);
}

function posWindow(rgb: number[][]): number[] {
  const n = rgb.length;
  const mu = [0, 0, 0];
  for (const row of rgb) {
    mu[0] += row[0];
    mu[1] += row[1];
    mu[2] += row[2];
  }
  mu[0] = Math.abs(mu[0] / n) < 1e-8 ? 1e-8 : mu[0] / n;
  mu[1] = Math.abs(mu[1] / n) < 1e-8 ? 1e-8 : mu[1] / n;
  mu[2] = Math.abs(mu[2] / n) < 1e-8 ? 1e-8 : mu[2] / n;

  const s1: number[] = [];
  const s2: number[] = [];
  for (const row of rgb) {
    const cn0 = row[0] / mu[0] - 1;
    const cn1 = row[1] / mu[1] - 1;
    const cn2 = row[2] / mu[2] - 1;
    s1.push(cn1 - cn2);
    s2.push(cn1 + cn2 - 2 * cn0);
  }
  const alpha = std(s1) / (std(s2) + 1e-8);
  const h = s1.map((v, i) => v + alpha * s2[i]);
  const hm = mean(h);
  return h.map((v) => v - hm);
}

function posStream(rgb: number[][], win = 48): number[] {
  const t = rgb.length;
  const out = new Array(t).fill(0);
  const counts = new Array(t).fill(0);
  if (t < win) return out;
  const w = Array.from({ length: win }, (_, i) =>
    win === 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * i) / (win - 1))),
  );
  for (let start = 0; start <= t - win; start++) {
    const h = posWindow(rgb.slice(start, start + win));
    for (let i = 0; i < win; i++) {
      out[start + i] += h[i] * w[i];
      counts[start + i] += w[i];
    }
  }
  return out.map((v, i) => v / Math.max(counts[i], 1e-8));
}

/** Zero-phase Butterworth bandpass (order 2 cascaded, filtfilt-style). */
function bandpass(x: number[], fs: number, lo: number, hi: number): number[] {
  if (x.length < 30) return x.slice();
  const forward = butterBand(x, fs, lo, hi);
  return butterBand(forward.reverse(), fs, lo, hi).reverse();
}

function butterBand(x: number[], fs: number, lo: number, hi: number): number[] {
  // Bilinear-transform 2nd-order bandpass coefficients (RBJ cookbook style, simplified).
  const bw = hi - lo;
  const f0 = Math.sqrt(lo * hi);
  const w0 = (2 * Math.PI * f0) / fs;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw * Math.sinh((Math.log(2) / 2) * (bw / f0) * (w0 / sinw));
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw;
  const a2 = 1 - alpha;
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const y = new Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = nb0 * xi + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    y[i] = yi;
  }
  return y;
}

function sqiFromBvp(bvp: number[], fs: number): number {
  if (bvp.length < fs * 4) return 0;
  const m = mean(bvp);
  const x = bvp.map((v) => v - m);
  const n = x.length;
  const spec = new Array(Math.floor(n / 2) + 1).fill(0);
  for (let k = 0; k < spec.length; k++) {
    let re = 0;
    let im = 0;
    const w = (-2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos(w * t);
      im += x[t] * Math.sin(w * t);
    }
    spec[k] = re * re + im * im;
  }
  let total = 0;
  let peak = 0;
  for (let k = 0; k < spec.length; k++) {
    const f = (k * fs) / n;
    if (f >= HR_LO && f <= HR_HI) {
      total += spec[k];
      if (spec[k] > peak) peak = spec[k];
    }
  }
  return Math.min(1, Math.max(0, peak / (total + 1e-12)));
}

function estimateHr(bvp: number[], fs: number): { hr: number | null; conf: number } {
  if (bvp.length < fs * 5) return { hr: null, conf: 0 };
  const m = mean(bvp);
  const x = bvp.map((v) => v - m);
  const n = x.length;
  const nperseg = Math.min(n, Math.max(64, Math.floor(fs * 8)));
  // Welch: one main segment for v0.1 (good enough; Python uses overlapping)
  const seg = x.slice(0, nperseg);
  const win = seg.map((_, i) =>
    nperseg === 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nperseg - 1))),
  );
  const wsum = win.reduce((a, b) => a + b * b, 0);
  const half = Math.floor(nperseg / 2) + 1;
  const psd = new Array(half).fill(0);
  const freqs = new Array(half);
  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    const ang = (-2 * Math.PI * k) / nperseg;
    for (let t = 0; t < nperseg; t++) {
      const v = seg[t] * win[t];
      re += v * Math.cos(ang * t);
      im += v * Math.sin(ang * t);
    }
    psd[k] = ((re * re + im * im) / wsum) * 2;
    freqs[k] = (k * fs) / nperseg;
  }
  let best = -1;
  let bestP = -1;
  let bandPower = 0;
  for (let k = 0; k < half; k++) {
    if (freqs[k] >= HR_LO && freqs[k] <= HR_HI) {
      bandPower += psd[k];
      if (psd[k] > bestP) {
        bestP = psd[k];
        best = k;
      }
    }
  }
  if (best < 0) return { hr: null, conf: 0 };
  let fPeak = freqs[best];
  if (best > 0 && best < half - 1) {
    const a = psd[best - 1];
    const b = psd[best];
    const c = psd[best + 1];
    const denom = a - 2 * b + c;
    const delta = Math.abs(denom) > 1e-12 ? (0.5 * (a - c)) / denom : 0;
    fPeak = freqs[best] + delta * (freqs[1] - freqs[0]);
  }
  return {
    hr: 60 * fPeak,
    conf: Math.min(1, Math.max(0, bestP / (bandPower + 1e-12))),
  };
}

function resampleRgb(tSec: number[], rgb: number[][], fs = FS): number[][] {
  const end = tSec[tSec.length - 1];
  const out: number[][] = [];
  for (let t = 0; t < end; t += 1 / fs) {
    // linear interp per channel
    let i = 1;
    while (i < tSec.length && tSec[i] < t) i++;
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(tSec.length - 1, i);
    const t0 = tSec[i0];
    const t1 = tSec[i1];
    const a = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    out.push([
      rgb[i0][0] + a * (rgb[i1][0] - rgb[i0][0]),
      rgb[i0][1] + a * (rgb[i1][1] - rgb[i0][1]),
      rgb[i0][2] + a * (rgb[i1][2] - rgb[i0][2]),
    ]);
  }
  return out;
}

export type HrResult = {
  hr_bpm: number | null;
  confidence: number;
  sqi: number;
  quality: "good" | "low";
  message: string;
  disclaimer: string;
};

export function hrFromTrace(tMs: number[], rgb: number[][]): HrResult {
  const disclaimer = "Wellness estimate only. Not a medical device.";
  const t0 = tMs[0];
  const tSec = tMs.map((t) => (t - t0) / 1000);
  const grid = resampleRgb(tSec, rgb);
  const bvp = posStream(grid, Math.min(48, grid.length));
  const bvpF = bandpass(bvp, FS, HR_LO, HR_HI);
  const sqi = sqiFromBvp(bvpF, FS);
  const { hr, conf } = estimateHr(bvpF, FS);
  if (hr === null || sqi < SQI_GATE) {
    return {
      hr_bpm: null,
      confidence: conf,
      sqi,
      quality: "low",
      message: "Signal too weak. Sit still in even light, face the camera, and retry.",
      disclaimer,
    };
  }
  return {
    hr_bpm: Math.round(hr * 10) / 10,
    confidence: conf,
    sqi,
    quality: "good",
    message: "Estimate ready.",
    disclaimer,
  };
}
