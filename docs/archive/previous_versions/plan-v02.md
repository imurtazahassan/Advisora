# Implementation Plan

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Course:** SE-1001 — Introduction to Software Engineering  
**Deliverable:** 4  
**Status:** Draft — accepted decisions incorporated; readiness validation pending

## 1. Objective

Prepare a controlled, traceable implementation of the approved
Human-Controlled Digital-Asset Advisory Application.

The implementation must follow the approved Deliverable 3 requirements,
architectural decisions, and cross-cutting constraints.

## 2. Source of Truth

The following documents govern implementation:

- Approved Deliverable 3 PRD.
- ADR-001 through ADR-005.
- Approved architecture documentation.
- AGENTS.md.
- Approved requirement and constraint definitions.

This plan does not override these documents.

## 3. Architectural Baseline

The approved architecture uses a Modular Monolith with Ports & Adapters.

Implementation must preserve:

- Clear module boundaries.
- Explicit component responsibilities.
- Module-owned persistence.
- External integrations behind defined ports and adapters.
- Decoupled messaging where specified.
- Controlled communication between modules.
- The approved authentication and authorization boundary.

No architectural decision may be changed without human review and approval.

## 4. Non-Negotiable Safety Requirements

### 4.1 Human authorization

- Every tranche requires fresh, explicit human authorization.
- The scheduler must not execute trades directly.
- Authorization expiry must be checked server-side.
- Authorization is valid for 60 seconds only.

### 4.2 Exchange permissions

- Withdrawal capability must not exist.
- Do not implement withdrawal endpoints, SDK methods, or data models.
- Verify exchange API key permissions.
- Reject keys when withdrawal permissions are enabled or cannot be verified.

### 4.3 Execution ledger

- Executed trades are append-only.
- Executed trade records cannot be updated or deleted.
- History and export features must not mutate execution records.

### 4.4 Market safety

- Market data older than 15 seconds locks Buy.
- Ticker latency greater than 5 seconds locks Buy.
- Preserve strict greater-than threshold comparisons.
- Plan resumption must not create retroactive orders.

### 4.5 Open questions

All baseline open questions must remain unresolved until explicitly decided by the responsible humans.

## 5. Proposed Implementation Order

| Order | Slice | Scope |
|---|---|---|
| 1 | VS-01 | User Access and Device Security |
| 2 | VS-02 | Market Data and Asset Eligibility |
| 3 | VS-03 | Advisory Signal Generation |
| 4 | VS-04 | Investment Plan Management |
| 5 | VS-05 | Tranche Scheduling and Human Authorization |
| 6 | VS-06 | Authorized Trade Execution |
| 7 | VS-07 | Notifications |
| 8 | VS-08 | Supporting Investment Features |
| 9 | VS-09 | Integration and Final Validation |

This sequence is proposed and must be validated against the dependency matrix.

## 6. Vertical Slice Expectations

Each slice must have:

1. A defined user-visible outcome.
2. Traceable requirements.
3. Explicit module ownership.
4. Identified dependencies.
5. Acceptance criteria.
6. Unit tests.
7. Integration tests where applicable.
8. Security tests where applicable.
9. Recorded implementation evidence.
10. Human review before acceptance.

## 7. Feature Coverage

### Core advisory functionality

- Advisory signal generation.
- Bilingual risk context.
- Signal validity and price-shift verification.
- Volatility detection.
- Signal accuracy.

### Investment plan functionality

- Capital allocation.
- Plan approval.
- Tranche scheduling.
- Individual authorization.
- Expiry and skipping.
- Pause, cancellation, restart, and adjustment.

### Supporting functionality

- Personal digital-asset watchlist.
- Executed trade history and CSV export.
- Private investment decision journal.
- Notification delivery.

## 8. Implementation Workflow

For each vertical slice:

1. Inspect its requirements and ADR dependencies.
2. Confirm scope with the human team.
3. Identify module boundaries and interfaces.
4. Define acceptance criteria.
5. Prepare tests before or alongside implementation.
6. Implement the smallest complete vertical slice.
7. Run relevant automated tests.
8. Review security and architecture compliance.
9. Record evidence and changes.
10. Obtain human acceptance before moving forward.

## 9. Testing Strategy

Testing should include:

- Unit testing.
- Integration testing.
- API and contract testing.
- Persistence and immutability testing.
- Authorization and security testing.
- Boundary-value testing.
- Market-data freshness and latency testing.
- Notification failure testing.
- End-to-end testing.

Critical safety rules require explicit negative tests.

## 10. Evidence and Documentation

Maintain:

- Requirement traceability.
- Implementation decisions.
- Test results.
- Security verification evidence.
- Change history.
- Known issues.
- Human approval records.

## 11. Change Control

Any proposed change to an approved requirement, ADR, security boundary,
or unresolved question must be documented and submitted for human review.

No AI agent or automated process may silently approve such a change.

## 12. Current Status

- Deliverable 3 baseline: approved by the team.
- Deliverable 4 planning: in preparation.
- Traceability matrix: draft.
- Implementation plan: draft.
- Implementation: source changes added across VS-01–VS-09; verification remains pending (see docs/IMPLEMENTATION_STATUS_AND_LIMITATIONS.md).
- Final implementation approval: pending.

## 13. Approval

This plan is not an approval of implementation.

Human review is required before implementation begins.

## 14. Baseline-Specific Acceptance Criteria

The following criteria must be preserved during implementation and verification.

### 14.1 Advisory Signal Safeguards

- Signals have a validity period of 60 seconds.
- A price shift strictly greater than 2.0% invalidates the signal.
- Exactly 2.0% does not trigger the strict greater-than rule.
- Ticker latency greater than 5 seconds locks Buy.
- Market-data staleness greater than 15 seconds locks Buy.
- A one-hour market movement greater than 5% triggers the approved volatility safeguards.
- Invalid or stale signals must not authorize execution.

### 14.2 Investment Plan Rules

- Maximum allocation is 5% of the exchange quote balance.
- Plans contain three equal tranches.
- Tranche calculations must follow the approved rounding-down rule.
- Initial tranche scheduling uses fixed 24-hour intervals.
- Plan setup must execute zero trades.
- Plan adjustments and restarts use current available balance, newly selected allocation and current market conditions, subject to the 5% cap.

### 14.3 Human Authorization Rules

- Every tranche requires its own explicit PIN or biometric authorization.
- Authorization expires after 60 seconds.
- Expiry must be enforced using trusted server-side timestamps.
- The scheduler cannot independently authorize or execute a tranche.
- An unauthorized tranche expires and is permanently skipped.
- No authorization may be reused for another tranche.

### 14.4 Plan Lifecycle

- Pause and cancellation preserve already executed tranches.
- Open authorization prompts must be revoked when required by the lifecycle rules.
- Resumption must not backfill missed tranches.
- OQ-05 is accepted: missed or expired tranches are permanently skipped; only future eligible tranches resume, each requiring fresh authorization.
- Submitted-order handling must follow the approved baseline.

### 14.5 Execution and Exchange Security

- Exchange integration must use approved architectural ports and adapters.
- API keys must have appropriate read and trade permissions.
- Withdrawal capability must be absent.
- If withdrawal permission cannot be verified absent, the API key remains inactive.
- Execution records must be append-only.
- No withdrawal or external-transfer functionality may be introduced.

### 14.6 Notifications

- Target at least 95% provider acceptance within 10 seconds across 1,000 test dispatches.
- Provider acceptance must not be represented as confirmed device delivery.
- Urdu translation failure must use the approved English fallback.
- Translation fallback must not delay notification dispatch.
- Notification dispatch must use the approved Transactional Outbox pattern.

### 14.7 Supporting Features

- Watchlist operations must not create trading or plan side effects.
- Trade history must use confirmed execution records.
- CSV export must not modify execution records.
- Investment journal entries must not affect authorization or signal validity.
- The 3% loss threshold is measurement-only and must not trigger forced closure.

### 14.8 Signal Accuracy

- Preserve the rolling 30-day measurement cohort.
- Do not invent a calculation formula or display behavior.
- OQ-08 is accepted: use outcome-based rolling 30-day accuracy. Exact outcome definition, evaluation horizon and minimum sample size remain to be specified.

## 15. Architecture Implementation Restrictions

The following restrictions are mandatory:

1. Preserve the approved Modular Monolith.
2. Preserve Ports and Adapters.
3. Use the approved relational database.
4. Use relational database-backed scheduling.
5. Do not introduce Redis.
6. Do not place a shared database client in common/.
7. Each module owns its repositories and logical data access.
8. External integrations must use approved ports and adapters.
9. Preserve the approved Transactional Outbox design.
10. Preserve the five approved ADRs.

## 16. Decision Register and Remaining Details

The six tracked open questions have received explicit human acceptance.
Their accepted decisions are recorded in docs/planning/DECISION_REGISTER.md.

- OQ-01: Accepted Option A. TypeScript, NestJS, React and PostgreSQL. A production exchange provider remains unselected; initial integration uses a simulated adapter.
- OQ-04: Accepted Option A. Fail safely and reconcile after outages.
- OQ-05: Accepted Option A. Resume future eligible tranches only; never backfill missed tranches.
- OQ-07: Accepted Option A. Optional audio summaries derived from approved text.
- OQ-08: Accepted Option A. Outcome-based rolling 30-day accuracy; detailed metric parameters remain to be specified.
- OQ-09: Accepted Option A. Additional measurable quality targets are documented in docs/planning/QUALITY_TARGETS.md.

The following implementation details remain subject to specification and verification:

- Exact Signal Accuracy outcome definition, evaluation horizon and minimum sample size.
- Objective asset eligibility, high-risk and liquidity classification criteria.
- Global spot-volume ranking source.
- Volatility reference price, rolling-window calculation and reset logic.
- Allocation minimum and numeric precision.
- Any remaining authentication fallback details.
- Production exchange-provider selection and approval.

Accepted decisions must not be silently revised. Remaining details must not be invented or treated as approved.
## 17. Implementation Readiness Gate

Before implementation begins, verify:

- [ ] Traceability matrix reviewed against the baseline.
- [ ] Dependency matrix reviewed.
- [ ] Vertical slices and WBS reviewed.
- [ ] PBS reviewed.
- [ ] All five ADRs preserved.
- [ ] Open questions documented.
- [ ] Architecture restrictions incorporated.
- [ ] Acceptance criteria reviewed.
- [ ] Human/team planning approval obtained.

Implementation remains blocked until the responsible team approves the planning documents.

## Deliverable 4 Reconciliation Clarification

The project owner has authorized proceeding with Deliverable 4. The six Deliverable 4 decisions OQ-01, OQ-04, OQ-05, OQ-07, OQ-08 and OQ-09, together with the previously resolved Deliverable 3 baseline questions OQ-02, OQ-03 and OQ-06, are recorded in the planning decision register.

This authorization does not mean objective implementation readiness has passed. The accepted technology stack is TypeScript, NestJS, React and PostgreSQL. Initial exchange integration remains simulated.

Production provider selection and the outstanding implementation specifications listed in PLAN_REVIEW_NOTES.md remain unresolved. No live trading or real financial transactions are authorized.
