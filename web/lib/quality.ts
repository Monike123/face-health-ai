/** Live pre-scan quality checks (framing, light, stillness, skin, eyewear). */

import type { Point } from "./roi";

export type QualityFlags = {
  face: boolean;
  framing: boolean;
  lighting: boolean;
  stillness: boolean;
  skin: boolean;
  eyewear: boolean; // true = clear (no glasses heuristic)
  tip: string | null;
};

export type Landmark = { x: number; y: number; z?: number };

const noseHistory: { t: number; x: number; y: number }[] = [];
const eyewearVotes: boolean[] = [];

export function resetQualityState() {
  noseHistory.length = 0;
  eyewearVotes.length = 0;
}

function luma(rgb: [number, number, number]): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Rough face bbox from landmarks (normalised 0..1). */
function faceBox(lm: Landmark[]): { cx: number; cy: number; w: number; h: number } {
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: maxX - minX,
    h: maxY - minY,
  };
}

/**
 * shortcut: edge heuristic for glasses — can false-positive on heavy brows;
 * upgrade when a real eyewear classifier is available.
 */
function eyewearLikely(
  frame: CanvasRenderingContext2D,
  lm: Landmark[],
  sw: number,
  sh: number,
): boolean {
  // Nose bridge patch between eyes (landmarks 168, 6, 197 area)
  const cx = ((lm[168]?.x ?? lm[6].x) * sw) | 0;
  const cy = ((lm[168]?.y ?? lm[6].y) * sh) | 0;
  const hw = Math.max(8, (0.06 * sw) | 0);
  const hh = Math.max(6, (0.04 * sh) | 0);
  const x0 = Math.max(0, cx - hw);
  const y0 = Math.max(0, cy - hh);
  const bw = Math.min(sw - x0, hw * 2);
  const bh = Math.min(sh - y0, hh * 2);
  if (bw < 4 || bh < 4) return false;
  const data = frame.getImageData(x0, y0, bw, bh).data;
  let edges = 0;
  let n = 0;
  for (let y = 1; y < bh - 1; y++) {
    for (let x = 1; x < bw - 1; x++) {
      const i = (y * bw + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const r = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
      if (Math.abs(l - r) > 28) edges++;
      n++;
    }
  }
  const density = n ? edges / n : 0;
  // Cheek darkness vs eye region as secondary cue
  const cheekL = luma([
    (lm[50] ? 128 : 128) as number,
    128,
    128,
  ]);
  void cheekL;
  return density > 0.22;
}

export function assessQuality(opts: {
  landmarks: Landmark[] | null;
  fusedRgb: [number, number, number] | null;
  regionRgb: Record<string, [number, number, number] | null>;
  frame: CanvasRenderingContext2D | null;
  sampleW: number;
  sampleH: number;
  now: number;
}): QualityFlags {
  const { landmarks, fusedRgb, regionRgb, frame, sampleW, sampleH, now } = opts;
  const face = Boolean(landmarks && landmarks.length >= 468);
  let framing = false;
  let stillness = true;
  let tip: string | null = null;

  if (face && landmarks) {
    const box = faceBox(landmarks);
    framing = box.w >= 0.28 && box.w <= 0.75 && Math.abs(box.cx - 0.5) < 0.15 && Math.abs(box.cy - 0.48) < 0.18;
    if (!framing) tip = "Centre your face in the oval and move a little closer.";

    const nose = landmarks[1];
    noseHistory.push({ t: now, x: nose.x, y: nose.y });
    while (noseHistory.length && now - noseHistory[0].t > 1000) noseHistory.shift();
    if (noseHistory.length >= 5) {
      let dist = 0;
      for (let i = 1; i < noseHistory.length; i++) {
        const a = noseHistory[i - 1];
        const b = noseHistory[i];
        dist += Math.hypot(b.x - a.x, b.y - a.y);
      }
      stillness = dist / box.w < 0.35;
      if (!stillness) tip = tip ?? "Hold still — small movements hurt the reading.";
    }
  } else {
    tip = "Move into the frame until your face is detected.";
  }

  let lighting = false;
  if (fusedRgb) {
    const L = luma(fusedRgb);
    lighting = L >= 70 && L <= 210;
    if (L < 70) tip = tip ?? "Too dark — face a window or lamp.";
    if (L > 210) tip = tip ?? "Too bright — soften the light on your face.";
  }

  let skin = false;
  const regions = Object.values(regionRgb).filter(Boolean) as [number, number, number][];
  if (regions.length >= 2) {
    // YCbCr-ish: chrominance in skin range for at least 2 regions
    let ok = 0;
    for (const [r, g, b] of regions) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (y > 40 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) ok++;
    }
    skin = ok >= 2;
    if (!skin) tip = tip ?? "Something may be covering your face — move hair off your forehead.";
  } else if (face) {
    tip = tip ?? "Move hair off your forehead for a clearer signal.";
  }

  let eyewear = true;
  if (face && landmarks && frame) {
    const likely = eyewearLikely(frame, landmarks, sampleW, sampleH);
    eyewearVotes.push(!likely);
    if (eyewearVotes.length > 15) eyewearVotes.shift();
    const clearVotes = eyewearVotes.filter(Boolean).length;
    eyewear = clearVotes >= eyewearVotes.length * 0.55;
    if (!eyewear) tip = "Glasses detected — remove them for a better reading.";
  }

  return { face, framing, lighting, stillness, skin, eyewear, tip };
}

export function canStartScan(q: QualityFlags, eyewearOverride: boolean): boolean {
  return q.face && q.framing && q.lighting && (q.eyewear || eyewearOverride);
}

/** Oval guide colour: green when framing ok. */
export function guideColor(q: QualityFlags): string {
  return q.face && q.framing ? "rgba(94, 234, 212, 0.85)" : "rgba(255, 255, 255, 0.45)";
}

export type { Point };
