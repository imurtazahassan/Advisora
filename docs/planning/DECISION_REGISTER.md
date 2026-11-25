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

## Previously Resolved PRD Baseline Decisions

These decisions were already resolved in the approved Deliverable 3 PRD. They are recorded here for implementation traceability and are not new Deliverable 4 decisions.

### OQ-02 — Capital Calculation

**Status:** Resolved in Deliverable 3.

- Calculate total user capital and available allocation using the connected exchange account's available quote-asset balance, such as USDT or USD.
- Exclude unconnected external wallets.
- Apply the approved 5% allocation cap using this resolved calculation basis.
- Preserve the original BR-01 wording while applying this operational clarification.

### OQ-03 — Primary Market-Data Source

**Status:** Resolved in Deliverable 3.

- Use the connected exchange's real-time WebSocket ticker stream as the primary reference price.
- During authorization, lock Buy and display "Market Data Unavailable" if ticker latency exceeds 5 seconds or market data is delayed by more than 15 seconds.
- Preserve the approved market-data freshness safeguards.

### OQ-06 — Authentication Recovery

**Status:** Resolved in Deliverable 3.

- Use native device operating-system biometric procedures, including Face ID or Touch ID where supported.
- PIN recovery requires two-factor OTP verification sent to the registered phone or email.
- OTP is for PIN recovery and is not a substitute for per-tranche device authorization.

---

## Engineering Decisions (Human-Delegated Authority)

These decisions record explicit engineering resolutions for specifications left open by the Deliverable 3 baseline. They preserve all approved requirements, ADRs, and safety thresholds and do not retroactively claim that the original PRD or ADRs mandated the chosen numeric parameter.

### ED-01 — Registration Password Minimum Length (12 Characters)

**Authority:** Technical lead under explicit human-delegated engineering authority (2026-11-25)  
**Scope:** `VS-01` User Access and Device Security (`AC-01.1`, `AC-01.4`)

- **Decision:** Set the minimum password length for new user registration (`POST /auth/register` and frontend registration form) to **12 characters**.
- **Compatibility Rule:** `POST /auth/login` continues to authenticate existing valid accounts regardless of whether an older account's password is shorter than 12 characters.
- **Rationale:** Neither `PRD.md` (`FR-01`–`FR-17`, `NFR-02`, `Resolved OQ-06`), `architecture.md` (`ASR-08`), `ADR-004`, nor `ACCEPTANCE_CRITERIA.md` defines a numeric password length. Aligning implementation with the 12-character policy previously drafted in `docs/evidence/VS-01/ACCEPTANCE_REPORT.md` provides stronger credential security without contradicting any approved baseline rule.
- **Preservation Note:** Original Deliverable 3 baseline documents remain unmodified.
