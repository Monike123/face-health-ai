# ADR-002: Web v0.1 Beta Before M2 (Milestone Exception)

- **Status:** Accepted  
- **Date:** 2026-11-14  
- **Deciders:** Project lead  

## Context
Milestone order is M0 → M6, with web delivery (P32) in M5. Real datasets (UBFC-rPPG, PURE) are still
downloading, so M2 benchmarks cannot run yet. The project lead wants a public, workable version now.

## Decision
Ship a **web v0.1 Beta** slice of P29/P31/P32 before M2:
- Scope: sign-up (Clerk), consent + wellness note, 30 s scan, **estimated HR + signal quality only**.
- Processing: browser computes ROI mean RGB (MediaPipe JS); server runs the existing classical POS
  pipeline (`hr_from_rgb`). Video never leaves the device. Nothing is stored.
- Labelled **Beta**; ADR-001 wellness language applies to every page.

## Exit criteria
- M2 (UBFC POS MAE ≤ 2.5 BPM + robustness) must pass before any v1.0 / non-Beta release.
- No HRV, RR, stress, BP, SpO2 or DL output on the web until their own release gates pass.

## Consequences
- Real-user feedback early; accuracy is unvalidated on datasets, so the UI shows "estimated".
- This is the only approved milestone exception; all others still require M0 → M6 order.
