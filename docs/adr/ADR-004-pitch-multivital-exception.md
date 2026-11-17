# ADR-004: Pitch Multi-vital Exception (Temporary)

- **Status:** Accepted (temporary)  
- **Date:** 2026-11-17  
- **Deciders:** Project lead  

## Context
ADR-002 limits the public web surface to estimated HR + signal quality. For an imminent boss/investor pitch we need experimental BP / SpO2 / skin-warmth proxies and an RGB screen-flash capture assist, before UBFC-calibrated models exist.

## Decision
Temporarily extend the web demo beyond ADR-002:
- Show research estimates for blood pressure, SpO2 proxy, and skin-warmth (°C-like) with per-metric confidence.
- Enable timed R→G→B→W screen flash during front-camera capture to improve multi-channel AC/DC.
- Gate via demo flags (`features.blood_pressure` / `features.spo2` and `NEXT_PUBLIC_MULTIVITAL=1`).
- **ADR-001 wellness intended use is unchanged** — no diagnose / treat / fever-screen / clinical claims.
- Marketing must not treat these proxies as validated product vitals.

## Consequences
- Pitch UI looks multi-vital; SpO2 and temperature confidence are capped at Low; BP at most Medium.
- Must revoke or replace this ADR after UBFC MAE gate + real calibration (MASTER_PLAN P24 / P35).
- Feedback / Neon schema stays HR-centric unless a later migration is approved.

## Alternatives considered
1. Preview-only cards with no numbers — rejected for this pitch (decision 1C).  
2. Full SaMD claims — rejected (ADR-001).
