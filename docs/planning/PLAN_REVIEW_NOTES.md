# Plan Review Notes

**Project:** Human-Controlled Digital-Asset Advisory Application
**Reviewed against:** Deliverable 3 PRD, approved ADRs and accepted decision register
**Review status:** Decision reconciliation applied; implementation readiness validation pending
**Plan reviewed:** plan.md, PBS.md, WBS.md, VERTICAL_SLICES.md, DEPENDENCY_MATRIX.md

## 1. Accepted Decisions

The following decisions have explicit human acceptance and are documented in DECISION_REGISTER.md:

- OQ-01: TypeScript, NestJS, React and PostgreSQL; simulated exchange adapter initially.
- OQ-04: Fail safely and reconcile exchange outages.
- OQ-05: Resume future eligible tranches only; never backfill missed tranches.
- OQ-07: Optional audio summaries.
- OQ-08: Outcome-based rolling 30-day Signal Accuracy.
- OQ-09: Additional measurable usability, accessibility and reliability targets.

A specific production exchange provider has not been selected.

## 2. OQ-09 Quality Targets

See QUALITY_TARGETS.md.

- Core task usability: at least 90% unassisted completion.
- Accessibility: WCAG 2.1 Level AA.
- API reliability: at least 99.5% successful eligible responses under documented conditions.
- API performance: p95 below 500 ms for ordinary API requests.
- Error recovery: understandable errors and safe recovery.
- Human authorization: 100% enforcement for simulated tranche orders.

These targets supplement, not replace, NFR-01 through NFR-04.

## 3. Existing Requirements to Preserve

### Market data and signals
- Signal expiry: 60 seconds.
- Price-shift lock: strictly greater than 2.0%.
- Market-data ticker latency greater than 5 seconds locks Buy.
- Market-data staleness greater than 15 seconds locks Buy.
- Exactly 2.0% does not trigger the strict greater-than price-shift rule.

### Investment plans and tranches
- Allocation cap: 5% of connected exchange available quote-asset balance.
- Three equal tranches, with downward rounding as specified by the baseline.
- Each tranche requires its own PIN/biometric authorization.
- Plan setup executes zero trades.
- An unapproved tranche expires and is permanently skipped.
- Pause/cancel preserves executed tranches and revokes open prompts.
- Accepted OQ-05 prohibits backfilling missed intervals.

### Trade execution and credentials
- No trade execution without valid, current, human-generated authorization for that tranche.
- Authorization cutoff is 60 seconds and uses server-side trusted timestamps.
- Executed trade records are append-only.
- No withdrawal or external-transfer functionality.
- If withdrawal permission cannot be verified as absent, the API key remains inactive.
- Initial exchange integration is simulated; no real transactions.

### Notifications and analytics
- Notification target: at least 95% provider acceptance within 10 seconds across 1,000 dispatches per configured channel.
- Provider acceptance is not confirmed device delivery.
- Urdu translation failure uses the approved English fallback without delaying dispatch.
- The 3% loss threshold is measurement-only; it must not trigger stop-loss or forced closure.
- Signal Accuracy uses a rolling 30-day cohort. Exact outcome definition, evaluation horizon and minimum sample size remain to be specified.

## 4. Remaining Specification Work

The following are not silently resolved by accepting OQ-01 through OQ-09:

- Production exchange-provider selection.
- Exact Signal Accuracy outcome definition, evaluation horizon and minimum sample size.
- Global spot-volume ranking source.
- Objective high-risk and illiquidity classification criteria.
- Volatility reference price, rolling-window calculation and reset logic.
- Allocation minimum and numeric precision.
- Any remaining authentication fallback details.

## 5. Traceability Matrix Control

Two traceability matrices exist: one in the project root and one in docs/planning.

Their hashes differ. Neither is deleted or overwritten by this reconciliation.

Historical reconciliation control: the planning copy at docs/planning/TRACEABILITY_MATRIX.md was selected as canonical after comparison. The root TRACEABILITY_MATRIX.md was synchronized to it, and both files are currently verified identical. The original root version is preserved in the reconciliation backup.

## 6. Architecture Restrictions

- Modular Monolith with Ports and Adapters.
- Module-owned repositories and logical data ownership.
- Relational database-backed scheduling; do not introduce Redis.
- No shared database client in common/.
- Transactional Outbox for notification dispatch.
- Preserve approved module boundaries and all five ADRs.

## 7. Review Outcome

The accepted decision register and OQ-09 quality targets have been incorporated into the planning documents.

This does not establish that implementation readiness has passed. Remaining specification work, traceability reconciliation, architecture verification and acceptance criteria must be checked before implementation is declared ready.

No implementation or test completion is claimed by this review.

## 8. Reconciliation Decision

The planning copy at `docs/planning/TRACEABILITY_MATRIX.md` is the canonical traceability matrix for this reconciled planning baseline because it contains the more complete FR, BR, C, XC and ADR mappings.

The root `TRACEABILITY_MATRIX.md` is synchronized from the planning copy. Its pre-reconciliation version is preserved in the timestamped backup created by the reconciliation script.

The six Deliverable 4 decisions OQ-01, OQ-04, OQ-05, OQ-07, OQ-08 and OQ-09 are accepted. Previously resolved Deliverable 3 baseline questions OQ-02, OQ-03 and OQ-06 are also recorded. Remaining implementation specifications are tracked separately and are not silently resolved.

This reconciliation does not claim implementation readiness or completed tests.
