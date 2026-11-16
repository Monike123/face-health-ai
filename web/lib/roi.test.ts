import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convexHull, ROI_REGIONS, roiPolygons } from "./roi";

describe("convexHull", () => {
  it("returns convex polygon for square corners out of order", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 0.5, y: 0.5 },
    ];
    const h = convexHull(pts);
    assert.equal(h.length, 4);
  });
});

describe("roiPolygons", () => {
  it("builds one hull per region for fake landmarks", () => {
    const lm = Array.from({ length: 478 }, (_, i) => ({
      x: (i % 20) / 20,
      y: Math.floor(i / 20) / 24,
    }));
    const polys = roiPolygons(lm, 100, 100);
    assert.equal(polys.length, Object.keys(ROI_REGIONS).length);
    for (const p of polys) assert.ok(p.length >= 3);
  });
});
