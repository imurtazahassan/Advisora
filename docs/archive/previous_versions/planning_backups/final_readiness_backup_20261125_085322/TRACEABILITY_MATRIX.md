# Requirements Traceability Matrix

**Project:** Human-Controlled Digital-Asset Advisory Application
**Baseline:** Deliverable 3
**Version:** 0.3
**Status:** Draft — human/team validation pending
**Last Updated:** 2026-11-25

---

## 1. Purpose

This matrix connects the approved requirements and architectural constraints to the proposed Deliverable 4 vertical slices.

It is a planning and verification artefact. A mapping does not mean that a requirement has been implemented or tested.

## 2. Vertical Slice Reference

| Slice | Name | Main Responsibility |
|---|---|---|
| VS-01 | User Access and Device Security | Authentication, device trust and security foundation |
| VS-02 | Market Data and Asset Eligibility | Market ingestion, data validity and eligible assets |
| VS-03 | Advisory Signal Generation | Signals, bilingual context and signal validity |
| VS-04 | Investment Plan Management | Plan creation, configuration and lifecycle |
| VS-05 | Tranche Scheduling and Human Authorization | Scheduling and per-tranche authorization |
| VS-06 | Authorized Trade Execution | Credentials, exchange integration and authorized execution |
| VS-07 | Notifications | WhatsApp, mobile push and notification delivery |
| VS-08 | Supporting Investment Features | Signal analytics, watchlist, trade history and journal |
| VS-09 | Integration and Final Validation | Cross-slice integration and end-to-end validation |

## 3. Functional Requirements

FR-01 to FR-14 are the original approved requirements. FR-15 to FR-17 are TA-provided additional requirements.

| Requirement | Requirement Area | Proposed Slice Mapping | Verification Focus |
|---|---|---|---|
| FR-01 | Generate Advisory Signals | VS-02, VS-03 | Eligible assets and advisory signal generation |
| FR-02 | Deliver Notifications | VS-07 | WhatsApp and mobile push notification delivery |
| FR-03 | Provide Bilingual Risk Context | VS-03, VS-07 | English/Urdu explanations and approved fallback |
| FR-04 | Signal validity and Buy authorization safeguards | VS-02, VS-03, VS-05 | 60-second validity, >2% price-shift invalidation and market-data lockout |
| FR-05 | Investment plan setup | VS-04 | 5% allocation cap and three-tranche calculation |
| FR-06 | Per-tranche human authorization | VS-05, VS-06 | Separate PIN/biometric authorization for every tranche |
| FR-07 | Authorization expiry | VS-05, VS-06 | Expired authorization cannot execute late |
| FR-08 | Pause and cancellation | VS-04, VS-05 | State changes, executed-tranche preservation and prompt revocation |
| FR-09 | Plan resumption | VS-04, VS-05 | Non-retroactive scheduling and prompt revocation |
| FR-10 | Plan cancellation and submitted-order handling | VS-04, VS-05, VS-06 | Submitted order safety and removal of unexecuted tranches |
| FR-11 | Plan restart | VS-04 | Recalculation using current balance and market conditions |
| FR-12 | Volatility monitoring and suppression | VS-02, VS-03 | >5% one-hour movement, warning and active-signal invalidation |
| FR-13 | Signal Accuracy | VS-08 | Rolling 30-day performance measurement and reporting-only 3% threshold |
| FR-14 | Exchange API-key security | VS-06 | Read/trade permissions, zero withdrawal capability and safe key storage |
| FR-15 | Personal Digital-Asset Watchlist (TA-provided) | VS-08 | Add/remove eligible assets; no trading or plan side effects |
| FR-16 | Executed Trade History and CSV Export (TA-provided) | VS-08 | Read-only confirmed execution records and CSV export |
| FR-17 | Private Investment Decision Journal (TA-provided) | VS-08 | Private notes; no effect on trading, authorization or signal validity |

**Important:** FR-14 is not a user-login requirement. It concerns exchange API-key security and credential management.

## 4. Authentication and Device Security Foundation

The approved architecture identifies authentication and biometric device/server trust under ASR-08 and NFR-02.

| Architectural Reference | Proposed Slice | Verification Focus |
|---|---|---|
| ASR-08 | VS-01, VS-05 | Device/server trust boundary and biometric authorization |
| NFR-02 | VS-01, VS-05, VS-06 | Security and authorization enforcement |
| ADR-004 | VS-01, VS-05, VS-06 | Four-stage authorization separation and ephemeral authorization tokens |

**Traceability note:** The current FR-01 to FR-17 baseline does not provide a separate functional requirement ID for general user login. Do not invent one. Verify the detailed authentication and recovery scope against the approved architecture and ADR-004.

## 5. Non-Functional Requirements

| Requirement | Proposed Slice Mapping | Verification Focus |
|---|---|---|
| NFR-01 | VS-02, VS-03, VS-05, VS-06 | Signal expiry, price-shift lock, allocation cap and enforcement |
| NFR-02 | VS-01, VS-05, VS-06 | Per-tranche authorization and zero acceptance of withdrawal-enabled keys |
| NFR-03 | VS-03, VS-07 | English and Urdu explanations or approved fallback |
| NFR-04 | VS-07 | At least 95% provider acceptance within 10 seconds |

## 6. Business Rules

| Requirement | Proposed Slice Mapping | Verification Focus |
|---|---|---|
| BR-01 | VS-04 | Plan setup and allocation rules |
| BR-02 | VS-04, VS-05 | Three equal tranches scheduled at fixed 24-hour intervals |
| BR-03 | VS-05, VS-06 | Explicit human authorization for every tranche |
| BR-04 | VS-02, VS-03, VS-05 | Signal validity and price-shift rules |
| BR-05 | VS-02, VS-03, VS-05 | Market-data and authorization safeguards |
| BR-06 | VS-05, VS-06 | One-minute authorization expiry; unauthorized tranche permanently skipped |
| BR-07 | VS-02, VS-03 | Volatility monitoring and suppression |
| BR-08 | VS-08 | Signal Accuracy measurement |
| BR-09 | VS-04, VS-05 | Executed-tranche and plan lifecycle integrity |
| BR-10 | VS-04, VS-05 | Restart/adjustment uses current available balance, newly selected allocation and current market conditions, subject to 5% cap |
| BR-11 | VS-06 | Exchange API-key permissions and withdrawal prohibition |
| BR-12 | VS-02, VS-03 | Asset eligibility and exclusion of high-risk/illiquid assets |

## 7. Constraints

| Constraint | Proposed Mapping | Verification Focus |
|---|---|---|
| C-01 | VS-05, VS-06 | Human authorization and execution restrictions |
| C-02 | Cross-cutting UX | Target users are non-technical savers |
| C-03 | VS-06 | Trade execution requires a supported exchange integration with appropriate read and trade permissions |
| C-04 | VS-07 | Notification delivery constraints |
| C-05 | VS-04, VS-05 | Plan and tranche lifecycle constraints |
| C-06 | Cross-cutting UX, VS-03, VS-07, VS-08 | No profit guarantee; disclaimers in advisory content, notifications and historical performance reporting |


## 8. Cross-Cutting Constraints

| Constraint | Proposed Mapping | Verification Focus |
|---|---|---|
| XC-01 | VS-02, VS-03, VS-05, VS-08 | Strict greater-than threshold comparisons |
| XC-02 | VS-05, VS-06 | No autonomous trade execution |
| XC-03 | VS-06, VS-08 | Append-only execution ledger and read-only history |
| XC-04 | VS-06 | Absolute absence of withdrawal/transfer capability |
| XC-05 | VS-05, VS-06 | Server-side trusted authorization cutoff |
| XC-06 | VS-02, VS-05 | Buy lock on stale or delayed market data |
| XC-07 | VS-04, VS-05 | Non-retroactive plan resumption |
| XC-08 | All applicable slices | Preserve unresolved implementation details and formally record accepted decisions |
| XC-09 | VS-03, VS-07 | Urdu fallback must not delay notification dispatch |
| XC-10 | VS-07 | Provider acceptance must not imply device delivery |
| XC-11 | VS-06 | Unverifiable withdrawal permissions keep API key inactive |
| XC-12 | VS-08 | 3% loss threshold is measurement-only |

## 9. Architectural Decision References

| ADR | Proposed Slice Mapping | Decision to Preserve |
|---|---|---|
| ADR-001 | All slices | Modular Monolith with Ports and Adapters |
| ADR-002 | All slices | Approved module boundaries and responsibilities |
| ADR-003 | All slices | Single relational database with logical module ownership |
| ADR-004 | VS-01, VS-05, VS-06 | Authentication and authorization separation |
| ADR-005 | VS-02, VS-06, VS-07 | External integration ports and Transactional Outbox |

## 10. Open Questions and Accepted Decisions

The following PRD open questions have subsequently received explicit project-owner decisions.

| Open Question | Decision Status | Accepted Planning Treatment |
|---|---|---|
| OQ-01 | Accepted | TypeScript, NestJS, React and PostgreSQL; initial exchange adapter is simulated. Production exchange provider remains unselected. |
| OQ-04 | Accepted | Fail safely during exchange outages; reconcile uncertain outcomes, use idempotency protection and never blindly retry. |
| OQ-05 | Accepted | Resume future eligible tranches only; missed tranches are permanently skipped and never backfilled. |
| OQ-07 | Accepted | Optional audio summaries use the approved written summary and cannot authorize or trigger trades. |
| OQ-08 | Accepted | Rolling 30-day outcome-based Signal Accuracy; measurement-only, with sample size and insufficient-data handling. |
| OQ-09 | Accepted | Adopt the approved measurable quality targets documented in QUALITY_TARGETS.md. |

Accepted decisions do not silently resolve remaining implementation specifications.

Outstanding specification work includes:
- Production exchange-provider selection.
- Signal Accuracy outcome definition, evaluation horizon and minimum sample size.
- Global spot-volume ranking source.
- Objective high-risk and illiquidity classification criteria.
- Volatility reference price, rolling-window calculation and reset logic.
- Allocation minimum and numeric precision.
- Remaining authentication fallback details.

## 11. Validation and Approval Status

| Validation Item | Status |
|---|---|
| FR-01 to FR-17 mapping | Planning baseline; independent source verification required |
| NFR-01 to NFR-04 mapping | Planning baseline; verification evidence pending |
| BR-01 to BR-12 mapping | Planning baseline; source wording retained in PRD |
| C-01 to C-06 mapping | Planning baseline; source wording retained in PRD |
| XC-01 to XC-12 mapping | Planning baseline; source verification required |
| ADR-001 to ADR-005 mapping | Planning baseline; architecture consistency review required |
| Accepted OQ decisions | Recorded; implementation specifications remain subject to validation |
| Implementation and test status | Not claimed complete |

**Overall status: RECONCILED PLANNING DRAFT — READINESS VERIFICATION PENDING**

No requirement is marked implemented or tested merely by this matrix.

## 12. Source References

- `docs/baseline/deliverable-3/PRD.md`
- `docs/baseline/deliverable-3/architecture.md`
- `docs/baseline/deliverable-3/AGENTS.md`
- `docs/baseline/deliverable-3/ADR/ADR-001-architecture-style.md`
- `docs/baseline/deliverable-3/ADR/ADR-002-component-boundaries.md`
- `docs/baseline/deliverable-3/ADR/ADR-003-data-persistence.md`
- `docs/baseline/deliverable-3/ADR/ADR-004-authentication-authorization.md`
- `docs/baseline/deliverable-3/ADR/ADR-005-external-integrations.md`
- `docs/planning/BASELINE_REQUIREMENTS_EXTRACT.txt`
- `docs/planning/PLAN_REVIEW_NOTES.md`


