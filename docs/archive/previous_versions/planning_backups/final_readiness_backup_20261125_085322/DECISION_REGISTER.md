# Approved Decision Register

**Project:** Human-Controlled Digital-Asset Advisory Application
**Baseline:** Deliverable 3 PRD
**Planning scope:** Deliverable 4
**Approval record:** Explicit human decisions in the project conversation
**Status:** Accepted decisions documented; local team-record verification pending

## OQ-01 — Exchange and Technology Stack

**Accepted option:** Option A

- Backend language: TypeScript.
- Backend framework: NestJS.
- Frontend: React.
- Database: PostgreSQL.
- Initial exchange integration: simulated/mock adapter.
- No live trading or real financial transactions in the initial implementation.

**Qualification:** A specific production exchange provider has not been selected by this decision.

## OQ-04 — Exchange Outage Behavior

**Accepted option:** Option A — Fail safely and reconcile.

- Block new execution requests during exchange unavailability.
- Never blindly retry an uncertain transaction.
- Reconcile transaction status after service recovery.
- Apply idempotency protection against duplicate execution.
- Preserve auditable execution status.
- Never extend the 60-second authorization window.
- No automatic execution after an outage.

## OQ-05 — Pause and Resume Scheduling

**Accepted option:** Option A — Resume future scheduled tranches only.

- Preserve executed tranches.
- Permanently skip missed or expired tranches.
- Never backfill missed executions.
- Resume only future eligible scheduled tranches.
- Require fresh authorization for every tranche.
- Record pause and resume events in the audit ledger.

## OQ-07 — Audio Summaries

**Accepted option:** Option A — Optional audio summaries.

- Users may choose audio or text.
- Audio is generated from the same approved written summary.
- Audio cannot authorize or trigger trades.
- Written summaries remain available.
- Audio-generation failure must not interrupt core functionality.

## OQ-08 — Signal Accuracy

**Accepted option:** Option A — Outcome-based rolling 30-day accuracy.

- Evaluate completed signal outcomes within a rolling 30-day cohort.
- Exclude signals whose evaluation period has not completed.
- Calculate accuracy as successful evaluated signals divided by all evaluated signals.
- Display the sample size.
- Display an insufficient-data state when the sample is too small.
- Explain that historical accuracy does not guarantee future performance.
- Signal Accuracy is measurement-only and cannot trigger trades or close positions.

**Still requiring specification:** Exact outcome definition, evaluation horizon, and minimum sample size.

## OQ-09 — Usability, Accessibility and Reliability Targets

**Accepted option:** Option A — Adopt the recommended measurable quality targets.

The approved planning targets are documented in QUALITY_TARGETS.md.

## Decision Control

These decisions record accepted direction. They do not authorize:
- Live trading or real financial transactions.
- Automatic trading or automatic stop-loss execution.
- Withdrawal or external-transfer functionality.
- Changes to approved security or authorization requirements.
- Unspecified production exchange-provider selection.
- Silent resolution of remaining implementation details.

Any change to an accepted decision requires explicit human review and approval.