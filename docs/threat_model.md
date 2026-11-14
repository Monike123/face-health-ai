# Threat Model Draft (Phase 33 — M0 stub)

## Assets
- Camera frames (biometric-sensitive)
- Derived vitals + session logs
- API tokens / keys
- Model weights

## Trust boundaries
- Local desktop process
- Browser (P32) ↔ backend API
- Optional video upload endpoint

## Top threats (initial)
| ID | Threat | Mitigation (planned) |
| :--- | :--- | :--- |
| T1 | Virtual camera / replay injection | P26 injection heuristics + PAD |
| T2 | Token theft / open WS | `wss://`, auth, short-lived tokens |
| T3 | Secret in frontend bundle | No master keys in JS; CI grep |
| T4 | Oversized upload DoS | Size/type limits + rate limit |
| T5 | Raw frame persistence | Default RAM-only; encrypt if consented |
| T6 | Dependency AGPL / malware | SOUP register + CI |

## Out of scope (v1)
- Full HIPAA covered-entity mode (unless later BAA path)
- Independent ISO/IEC 30107-3 lab certification

_This document will expand in M5 before public API launch._
