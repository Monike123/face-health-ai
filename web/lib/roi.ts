// Must match configs/landmark_config.yaml (enforced by tests/unit/test_roi_parity.py).
export const ROI_REGIONS: Record<string, number[]> = {
  forehead: [10, 338, 297, 332, 284, 251, 389, 356, 109, 67, 103, 104, 105, 66, 107, 9],
  left_malar: [116, 123, 147, 213, 192, 214, 210, 211, 32, 208, 206, 203, 142, 100],
  right_malar: [345, 352, 376, 433, 416, 434, 430, 431, 262, 428, 426, 423, 371, 329],
};

type Point = { x: number; y: number };

/** Polygons in canvas pixels for normalised MediaPipe landmarks. */
export function roiPolygons(landmarks: Point[], w: number, h: number): Point[][] {
  return Object.values(ROI_REGIONS).map((idx) =>
    idx.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h })),
  );
}

/**
 * DC-preserving mean RGB over the union of ROI polygons (same as roi_extractor.fused_mean_rgb).
 * Returns null when fewer than 200 skin pixels are covered.
 */
export function meanRoiRgb(
  frame: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  polys: Point[][],
): [number, number, number] | null {
  const { width: w, height: h } = frame.canvas;
  mask.clearRect(0, 0, w, h);
  mask.fillStyle = "#fff";
  mask.beginPath();
  for (const poly of polys) {
    poly.forEach((p, i) => (i === 0 ? mask.moveTo(p.x, p.y) : mask.lineTo(p.x, p.y)));
    mask.closePath();
  }
  mask.fill("evenodd");

  const px = frame.getImageData(0, 0, w, h).data;
  const m = mask.getImageData(0, 0, w, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 3; i < m.length; i += 4) {
    if (m[i] > 127) {
      r += px[i - 3];
      g += px[i - 2];
      b += px[i - 1];
      n++;
    }
  }
  return n < 200 ? null : [r / n, g / n, b / n];
}
