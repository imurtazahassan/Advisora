# Plan Review Notes

**Project:** Human-Controlled Digital-Asset Advisory Application
**Reviewed against:** Deliverable 3 baseline extract
**Review status:** Findings identified; team approval pending
**Plan reviewed:** plan.md, plan-v01.md

---

## 1. Requirement Mapping Corrections

- FR-14 concerns exchange API-key permissions and credential management. Ensure it is mapped to the credential-management and exchange-integration work.
- VS-01 (User Access and Device Security) needs its own verified requirement references. Do not use FR-14 as a substitute for user-login requirements.
- Confirm all FR-01 to FR-17 mappings against the approved PRD.

## 2. Critical Acceptance Criteria to Make Explicit

### Market data and signals
- Signal expiry: 60 seconds.
- Price-shift lock: strictly greater than 2.0%.
- Market-data ticker latency greater than 5 seconds locks Buy.
- Market-data staleness greater than 15 seconds locks Buy.
- Exactly 2.0% does not trigger the strict greater-than price-shift rule.

### Investment plans and tranches
- Allocation cap: 5% of exchange quote balance.
- Three tranches, with rounding down as specified by the baseline.
- Each tranche requires its own PIN/biometric authorization.
- Plan setup must execute zero trades.
- An unapproved tranche expires and is permanently skipped.
- Pause/cancel preserves executed tranches and revokes open prompts.
- Resume must not backfill missed tranches.
- Exact resume scheduling details remain subject to OQ-05.

### Trade execution and credentials
- No trade execution without valid, current, human-generated authorization for that tranche.
- Authorization cutoff is 60 seconds and must use server-side trusted timestamps.
- Executed trade records are append-only.
- No withdrawal or external-transfer functionality may exist.
- If withdrawal permission cannot be verified as absent, the API key must remain inactive.

### Notifications and analytics
- Notification target: at least 95% provider acceptance within 10 seconds across 1,000 test dispatches.
- Provider acceptance must not be described as confirmed device delivery.
- Urdu translation failure must use the approved English fallback without delaying dispatch.
- The 3% loss threshold is measurement-only; it must not trigger stop-loss or forced closure.
- Signal Accuracy uses a rolling 30-day cohort; exact calculation/display details remain subject to OQ-08.

## 3. Architecture Restrictions to Preserve

- Modular Monolith with Ports and Adapters.
- Module-owned repositories and logical data ownership.
- Relational database-backed scheduling; do not introduce Redis.
- No shared database client in common/.
- Transactional Outbox for notification dispatch.
- Preserve all approved module boundaries and ADR decisions.

## 4. Open Questions

Keep these unresolved unless the team explicitly decides otherwise:

- OQ-01
- OQ-04
- OQ-05
- OQ-07
- OQ-08
- OQ-09

## 5. Review Decision

Status: Pending human/team review.

These notes identify items to verify or incorporate. They do not independently approve changes to the requirements, architecture, or implementation plan.
