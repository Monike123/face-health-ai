// Must match configs/landmark_config.yaml (enforced by tests/unit/test_roi_parity.py).
export const ROI_REGIONS: Record<string, number[]> = {
  forehead: [10, 338, 297, 332, 333, 334, 296, 336, 9, 107, 66, 105, 104, 103, 67, 109],
  left_malar: [116, 117, 118, 119, 120, 100, 142, 203, 205, 50, 187, 147, 123],
  right_malar: [345, 346, 347, 348, 349, 329, 371, 423, 425, 280, 411, 376, 352],
};

export type Point = { x: number; y: number };

/** Andrew's monotone chain convex hull. */
export function convexHull(pts: Point[]): Point[] {
  const unique = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (unique.length <= 2) return unique;
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Hull polygons in canvas pixels for normalised MediaPipe landmarks. */
export function roiPolygons(landmarks: Point[], w: number, h: number): Point[][] {
  return Object.values(ROI_REGIONS).map((idx) =>
    convexHull(idx.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }))),
  );
}

export type RoiSample = {
  fused: [number, number, number];
  regions: Record<string, [number, number, number] | null>;
  pixelCount: number;
};

function bboxOf(polys: Point[][]): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  let any = false;
  for (const poly of polys) {
    for (const p of poly) {
      any = true;
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  }
  if (!any) return null;
  return {
    x0: Math.max(0, Math.floor(x0)),
    y0: Math.max(0, Math.floor(y0)),
    x1: Math.ceil(x1),
    y1: Math.ceil(y1),
  };
}

/**
 * DC-preserving mean RGB over ROI hulls. Reads only the bounding box.
 * Returns null when fewer than 200 skin pixels are covered.
 */
export function sampleRoiRgb(
  frame: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  polys: Point[][],
  regionPolys?: Record<string, Point[]>,
): RoiSample | null {
  const { width: w, height: h } = frame.canvas;
  const box = bboxOf(polys);
  if (!box) return null;
  const x0 = box.x0;
  const y0 = box.y0;
  const bw = Math.min(w - x0, Math.max(1, box.x1 - x0));
  const bh = Math.min(h - y0, Math.max(1, box.y1 - y0));

  mask.clearRect(0, 0, w, h);
  mask.fillStyle = "#fff";
  mask.beginPath();
  for (const poly of polys) {
    poly.forEach((p, i) => (i === 0 ? mask.moveTo(p.x, p.y) : mask.lineTo(p.x, p.y)));
    mask.closePath();
  }
  mask.fill();

  const px = frame.getImageData(x0, y0, bw, bh).data;
  const m = mask.getImageData(x0, y0, bw, bh).data;
  // Remap: getImageData returns a bw×bh buffer — index relative to bbox.
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 3; i < m.length; i += 4) {
    if (m[i] > 127) {
      r += px[i - 3];
      g += px[i - 2];
      b += px[i - 1];
      n++;
    }
  }
  if (n < 200) return null;

  const regions: Record<string, [number, number, number] | null> = {};
  if (regionPolys) {
    for (const [name, poly] of Object.entries(regionPolys)) {
      mask.clearRect(0, 0, w, h);
      mask.fillStyle = "#fff";
      mask.beginPath();
      poly.forEach((p, i) => (i === 0 ? mask.moveTo(p.x, p.y) : mask.lineTo(p.x, p.y)));
      mask.closePath();
      mask.fill();
      const rm = mask.getImageData(x0, y0, bw, bh).data;
      let rr = 0,
        rg = 0,
        rb = 0,
        rn = 0;
      for (let i = 3; i < rm.length; i += 4) {
        if (rm[i] > 127) {
          rr += px[i - 3];
          rg += px[i - 2];
          rb += px[i - 1];
          rn++;
        }
      }
      regions[name] = rn >= 40 ? [rr / rn, rg / rn, rb / rn] : null;
    }
  }

  return { fused: [r / n, g / n, b / n], regions, pixelCount: n };
}

/** @deprecated Prefer sampleRoiRgb — kept for callers that only need fused mean. */
export function meanRoiRgb(
  frame: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  polys: Point[][],
): [number, number, number] | null {
  return sampleRoiRgb(frame, mask, polys)?.fused ?? null;
}

/** Named hull polygons for quality checks. */
export function namedRoiPolygons(
  landmarks: Point[],
  w: number,
  h: number,
): Record<string, Point[]> {
  const out: Record<string, Point[]> = {};
  for (const [name, idx] of Object.entries(ROI_REGIONS)) {
    out[name] = convexHull(idx.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h })));
  }
  return out;
}
