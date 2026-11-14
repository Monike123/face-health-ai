# ADR-001: Intended Use — Wellness First

- **Status:** Accepted  
- **Date:** 2026-10-13  
- **Deciders:** Project lead  

## Context
FaceHealth can be positioned as either a general wellness / fitness tool or a regulated SaMD (Software as a Medical Device). Regulatory burden, claim language, and clinical evidence differ sharply.

## Decision
Ship **v1 as a general wellness product**:
- Measure and display HR, time-domain HRV, respiration rate, wellness stress index, and signal quality.
- **No** diagnose / treat / screen / clinical decision-support claims in UI or marketing.
- Practice lightweight IEC 62304 / ISO 14971 habits from day one to reduce future SaMD rework.
- Blood pressure and SpO2 remain **research backlog**, feature-flagged off.

## Consequences
- Faster path to a usable product and SDK.
- Must show wellness disclaimers in session UX (Phase 31).
- Future SaMD would require new intended-use ADR, clinical study (P34), and claim redesign.

## Alternatives considered
1. SaMD from day one — rejected (cost/time).  
2. Research-only forever — rejected (commercial goal).
