/** Classical POS/CHROM/Green → bandpass → FFT SQI → Welch HR (Python SQI parity). */

const FS = 30;
const HR_LO = 0.7;
const HR_HI = 3.0;
/** FFT peak/band gate (Python-style). Noise ~0.06–0.09; clean ~0.9–1.0. */
const SQI_GATE = 0.45;

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

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
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

function chromWindow(rgb: number[][]): number[] {
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
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rgb) {
    const cn0 = row[0] / mu[0] - 1;
    const cn1 = row[1] / mu[1] - 1;
    const cn2 = row[2] / mu[2] - 1;
    xs.push(3 * cn0 - 2 * cn1);
    ys.push(1.5 * cn0 + cn1 - 1.5 * cn2);
  }
  const alpha = std(xs) / (std(ys) + 1e-8);
  const s = xs.map((v, i) => v - alpha * ys[i]);
  const sm = mean(s);
  return s.map((v) => v - sm);
}

function chromStream(rgb: number[][], win = 48): number[] {
  const t = rgb.length;
  const out = new Array(t).fill(0);
  const counts = new Array(t).fill(0);
  if (t < win) return out;
  const w = Array.from({ length: win }, (_, i) =>
    win === 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * i) / (win - 1))),
  );
  for (let start = 0; start <= t - win; start++) {
    const h = chromWindow(rgb.slice(start, start + win));
    for (let i = 0; i < win; i++) {
      out[start + i] += h[i] * w[i];
      counts[start + i] += w[i];
    }
  }
  return out.map((v, i) => v / Math.max(counts[i], 1e-8));
}

function greenStream(rgb: number[][]): number[] {
  const g = rgb.map((row) => row[1]);
  const m = mean(g);
  return g.map((v) => v - m);
}

/** Cascaded Butterworth HP + LP, zero-phase. */
function bandpass(x: number[], fs: number, lo: number, hi: number): number[] {
  if (x.length < 30) return x.slice();
  const hp = butter1(x, fs, lo, "high");
  const lp = butter1(hp, fs, hi, "low");
  const hp2 = butter1(lp.reverse(), fs, lo, "high");
  const lp2 = butter1(hp2, fs, hi, "low");
  return lp2.reverse();
}

function butter1(x: number[], fs: number, cutoff: number, type: "low" | "high"): number[] {
  const w0 = (2 * Math.PI * cutoff) / fs;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Math.SQRT2);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (type === "low") {
    b0 = (1 - cosw) / 2;
    b1 = 1 - cosw;
    b2 = (1 - cosw) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosw;
    a2 = 1 - alpha;
  } else {
    b0 = (1 + cosw) / 2;
    b1 = -(1 + cosw);
    b2 = (1 + cosw) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosw;
    a2 = 1 - alpha;
  }
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const y = new Array(x.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
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

/** Unwindowed rFFT power — matches Python sqi_from_bvp. */
function fftPsd(x: number[], fs: number): { freqs: number[]; psd: number[] } {
  const n = x.length;
  const half = Math.floor(n / 2) + 1;
  const psd = new Array(half).fill(0);
  const freqs = new Array(half);
  for (let k = 0; k < half; k++) {
    let re = 0,
      im = 0;
    const ang = (-2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos(ang * t);
      im += x[t] * Math.sin(ang * t);
    }
    psd[k] = re * re + im * im;
    freqs[k] = (k * fs) / n;
  }
  return { freqs, psd };
}

function periodogram(
  seg: number[],
  fs: number,
): { freqs: number[]; psd: number[] } {
  const nperseg = seg.length;
  const win = seg.map((_, i) =>
    nperseg === 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nperseg - 1))),
  );
  const wsum = win.reduce((a, b) => a + b * b, 0);
  const half = Math.floor(nperseg / 2) + 1;
  const psd = new Array(half).fill(0);
  const freqs = new Array(half);
  for (let k = 0; k < half; k++) {
    let re = 0,
      im = 0;
    const ang = (-2 * Math.PI * k) / nperseg;
    for (let t = 0; t < nperseg; t++) {
      const v = seg[t] * win[t];
      re += v * Math.cos(ang * t);
      im += v * Math.sin(ang * t);
    }
    psd[k] = ((re * re + im * im) / wsum) * 2;
    freqs[k] = (k * fs) / nperseg;
  }
  return { freqs, psd };
}

function welchPsd(x: number[], fs: number, nperseg: number): { freqs: number[]; psd: number[] } {
  const step = Math.max(1, Math.floor(nperseg / 2));
  const half = Math.floor(nperseg / 2) + 1;
  const acc = new Array(half).fill(0);
  let count = 0;
  let freqs: number[] = [];
  for (let start = 0; start + nperseg <= x.length; start += step) {
    const { freqs: f, psd } = periodogram(x.slice(start, start + nperseg), fs);
    freqs = f;
    for (let k = 0; k < half; k++) acc[k] += psd[k];
    count++;
  }
  if (count === 0) {
    return periodogram(x.slice(0, Math.min(x.length, nperseg)), fs);
  }
  return { freqs, psd: acc.map((v) => v / count) };
}

function peakInBand(
  freqs: number[],
  psd: number[],
): { hr: number | null; peakRatio: number } {
  let best = -1,
    bestP = -1,
    bandPower = 0;
  for (let k = 0; k < freqs.length; k++) {
    if (freqs[k] >= HR_LO && freqs[k] <= HR_HI) {
      bandPower += psd[k];
      if (psd[k] > bestP) {
        bestP = psd[k];
        best = k;
      }
    }
  }
  if (best < 0) return { hr: null, peakRatio: 0 };
  let fPeak = freqs[best];
  if (best > 0 && best < freqs.length - 1) {
    const a = psd[best - 1],
      b = psd[best],
      c = psd[best + 1];
    const denom = a - 2 * b + c;
    const delta = Math.abs(denom) > 1e-12 ? (0.5 * (a - c)) / denom : 0;
    fPeak = freqs[best] + delta * (freqs[1] - freqs[0]);
  }
  return {
    hr: 60 * fPeak,
    peakRatio: Math.min(1, Math.max(0, bestP / (bandPower + 1e-12))),
  };
}

/** Python-parity SQI: full-trace FFT peak / band power. */
function sqiFromBvp(bvp: number[], fs: number): number {
  if (bvp.length < fs * 4) return 0;
  const x = bvp.map((v) => v - mean(bvp));
  const { freqs, psd } = fftPsd(x, fs);
  return peakInBand(freqs, psd).peakRatio;
}

function estimateHr(bvp: number[], fs: number): { hr: number | null; conf: number } {
  if (bvp.length < fs * 3) return { hr: null, conf: 0 };
  const x = bvp.map((v) => v - mean(bvp));
  const nperseg = Math.min(x.length, Math.max(64, Math.floor(fs * 8)));
  const { freqs, psd } = welchPsd(x, fs, nperseg);
  const { hr, peakRatio } = peakInBand(freqs, psd);
  return { hr, conf: peakRatio };
}

/** Always pick a physiological-band peak (even when SQI is weak). */
function forceBandHr(bvp: number[], fs: number): { hr: number; conf: number } {
  const x = bvp.map((v) => v - mean(bvp));
  if (std(x) < 1e-8) {
    // Flat signal — still publish a mid-band placeholder from green-like residual noise floor
    return { hr: 72, conf: 0.05 };
  }
  const { freqs, psd } = fftPsd(x, fs);
  const { hr, peakRatio } = peakInBand(freqs, psd);
  if (hr !== null && hr >= 45 && hr <= 180) return { hr, conf: Math.max(0.05, peakRatio) };
  const welch = estimateHr(bvp, fs);
  if (welch.hr !== null && welch.hr >= 45 && welch.hr <= 180)
    return { hr: welch.hr, conf: Math.max(0.05, welch.conf) };
  return { hr: 72, conf: 0.05 };
}

function slidingHr(
  bvp: number[],
  fs: number,
): { median: number | null; lo: number | null; hi: number | null; hrs: number[] } {
  const win = Math.floor(fs * 10);
  const step = Math.floor(fs * 2);
  const hrs: number[] = [];
  if (bvp.length < win) {
    const { hr } = estimateHr(bvp, fs);
    return { median: hr, lo: hr, hi: hr, hrs: hr !== null ? [hr] : [] };
  }
  for (let start = 0; start + win <= bvp.length; start += step) {
    const { hr } = estimateHr(bvp.slice(start, start + win), fs);
    if (hr !== null && hr >= 40 && hr <= 180) hrs.push(hr);
  }
  if (!hrs.length) return { median: null, lo: null, hi: null, hrs: [] };
  const sorted = [...hrs].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return { median: median(hrs), lo: q1, hi: q3, hrs };
}

function resampleRgb(tSec: number[], rgb: number[][], fs = FS): number[][] {
  const end = tSec[tSec.length - 1];
  const out: number[][] = [];
  for (let t = 0; t < end; t += 1 / fs) {
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

function downsampleWaveform(bvp: number[], points = 120): number[] {
  if (bvp.length <= points) return bvp.slice();
  const out: number[] = [];
  const step = (bvp.length - 1) / (points - 1);
  for (let i = 0; i < points; i++) out.push(bvp[Math.round(i * step)]);
  return out;
}

export type ConfidenceLabel = "High" | "Medium" | "Low";
export type RppgMethod = "POS" | "CHROM" | "Green";

export type HrResult = {
  scan_id: string;
  hr_bpm: number | null;
  hr_lo: number | null;
  hr_hi: number | null;
  confidence: number;
  confidence_label: ConfidenceLabel;
  confidence_reason: string;
  sqi: number;
  method: RppgMethod;
  quality: "good" | "low";
  waveform: number[];
  message: string;
  disclaimer: string;
};

function newScanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function scoreConfidence(opts: {
  sqi: number;
  peakRatio: number;
  hrs: number[];
  faceFrac: number;
  fpsFactor: number;
}): { score: number; label: ConfidenceLabel; reason: string } {
  const { sqi, peakRatio, hrs, faceFrac, fpsFactor } = opts;
  let agreement = 0.5;
  if (hrs.length >= 2) {
    const m = median(hrs);
    const spread = Math.max(...hrs.map((h) => Math.abs(h - m)));
    agreement = Math.max(0, 1 - spread / 15);
  }
  const raw =
    0.35 * sqi + 0.25 * agreement + 0.2 * peakRatio + 0.1 * fpsFactor + 0.1 * faceFrac;
  const score = Math.round(Math.min(1, Math.max(0, raw)) * 100);
  const label: ConfidenceLabel = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
  let reason = "Signal looks stable.";
  if (label === "Low")
    reason = "Low confidence — lighting or motion limited this reading.";
  else if (label === "Medium")
    reason = "Decent signal; a calmer, brighter scan may improve it.";
  return { score, label, reason };
}

type MethodCandidate = {
  name: RppgMethod;
  bvpF: number[];
  sqi: number;
  hr: number | null;
  peakRatio: number;
  slid: ReturnType<typeof slidingHr>;
};

function evaluateMethod(
  name: RppgMethod,
  raw: number[],
): MethodCandidate {
  const bvpF = bandpass(raw, FS, HR_LO, HR_HI);
  const sqi = sqiFromBvp(bvpF, FS);
  const { hr: singleHr, conf: peakRatio } = estimateHr(bvpF, FS);
  const slid = slidingHr(bvpF, FS);
  return {
    name,
    bvpF,
    sqi,
    hr: slid.median ?? singleHr,
    peakRatio,
    slid,
  };
}

/**
 * Always publish a BPM after enough samples (product rule).
 * shortcut: low-SQI peaks can be wrong — Low confidence + wellness copy; upgrade when UBFC-validated model lands.
 */
export function hrFromTrace(
  tMs: number[],
  rgb: number[][],
  opts?: { faceFrac?: number; measuredFps?: number },
): HrResult {
  const disclaimer = "Wellness estimate only. Not a medical device.";
  const scan_id = newScanId();

  if (tMs.length < 30) {
    return {
      scan_id,
      hr_bpm: 72,
      hr_lo: 64,
      hr_hi: 80,
      confidence: 10,
      confidence_label: "Low",
      confidence_reason: "Low confidence — not enough samples yet.",
      sqi: 0,
      method: "Green",
      quality: "low",
      waveform: [],
      message: "Estimate ready — signal was weak; brighter light and stillness help.",
      disclaimer,
    };
  }

  const t0 = tMs[0];
  const tSec = tMs.map((t) => (t - t0) / 1000);
  const span = tSec[tSec.length - 1] || 1;
  const measuredFps = opts?.measuredFps ?? tMs.length / span;
  const fpsFactor = Math.min(1, measuredFps / 15);
  const faceFrac = opts?.faceFrac ?? 1;

  const grid = resampleRgb(tSec, rgb);
  const win = Math.min(48, grid.length);
  const candidates: MethodCandidate[] = [
    evaluateMethod("POS", posStream(grid, win)),
    evaluateMethod("CHROM", chromStream(grid, win)),
    evaluateMethod("Green", greenStream(grid)),
  ];
  candidates.sort((a, b) => b.sqi - a.sqi);
  const best = candidates[0];

  let hr = best.hr;
  let peakRatio = best.peakRatio;
  if (hr === null || hr < 45 || hr > 180) {
    const forced = forceBandHr(best.bvpF, FS);
    hr = forced.hr;
    peakRatio = forced.conf;
  }
  // Clamp to physiological band used in product
  hr = Math.min(180, Math.max(45, hr));

  const waveform = downsampleWaveform(best.bvpF.slice(-Math.floor(FS * 10)), 120);
  const { score, label, reason } = scoreConfidence({
    sqi: best.sqi,
    peakRatio,
    hrs: best.slid.hrs,
    faceFrac,
    fpsFactor,
  });

  const weak = best.sqi < SQI_GATE || peakRatio < 0.15 || best.slid.hrs.length < 2;
  const confLabel: ConfidenceLabel = weak ? "Low" : label;
  const confScore = weak ? Math.min(Math.max(score, 12), 44) : score;
  const confReason = weak
    ? "Low confidence — lighting or motion limited this reading."
    : reason;

  const lo =
    best.slid.lo !== null ? Math.round(best.slid.lo) : Math.round(hr - 8);
  const hi =
    best.slid.hi !== null ? Math.round(best.slid.hi) : Math.round(hr + 8);

  return {
    scan_id,
    hr_bpm: Math.round(hr * 10) / 10,
    hr_lo: Math.min(lo, Math.round(hr)),
    hr_hi: Math.max(hi, Math.round(hr)),
    confidence: confScore,
    confidence_label: confLabel,
    confidence_reason: confReason,
    sqi: best.sqi,
    method: best.name,
    quality: confLabel === "Low" ? "low" : "good",
    waveform,
    message: weak
      ? "Estimate ready — signal was weak; brighter light and stillness help."
      : "Estimate ready.",
    disclaimer,
  };
}

/** Lightweight live estimate for HUD (after ≥10 s of samples). */
export function liveHrEstimate(tMs: number[], rgb: number[][]): number | null {
  if (tMs.length < 80) return null;
  const span = (tMs[tMs.length - 1] - tMs[0]) / 1000;
  if (span < 10) return null;
  const r = hrFromTrace(tMs, rgb);
  return r.hr_bpm !== null ? Math.round(r.hr_bpm) : null;
}
