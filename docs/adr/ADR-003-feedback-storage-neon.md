# ADR-003: Feedback Storage on Neon + Resend Notify

## Status
Accepted (v0.2)

## Context
Showcase users need a way to report whether the heart-rate estimate felt accurate, without accounts. We also want optional anonymous colour-signal traces for later model work, and an email on every submission.

## Decision
- Store feedback in **Neon Postgres** (`scan_feedback`), provisioned via `vercel integration add neon`.
- Email every submission to `manassawant5913@gmail.com` via **Resend** (HTTP API).
- Never store frames, face images, IP addresses, or user ids with feedback.
- Colour-signal JSON is stored **only** when the user opts in (`trace_consent`).
- Retention: 12 months.

## Consequences
- Web demo remains open (no Clerk required).
- Ops depends on Neon + Resend free tiers (Resend: 100 emails/day on free).
- Trace opt-in must stay off by default in the UI.
