# Requirements Traceability Matrix

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Course:** SE-1001 — Introduction to Software Engineering  
**Baseline:** Approved Deliverable 3  
**Status:** Draft — Pending independent verification

## 1. Purpose

This document links approved requirements and architectural constraints
to proposed implementation areas and verification activities.

Deliverable 3 remains the source of truth. This matrix does not approve,
modify, or reinterpret any requirement.

## 2. Proposed Vertical Slices

| ID | Vertical Slice |
|---|---|
| VS-01 | User Access and Device Security |
| VS-02 | Market Data and Asset Eligibility |
| VS-03 | Advisory Signal Generation |
| VS-04 | Investment Plan Management |
| VS-05 | Tranche Scheduling and Human Authorization |
| VS-06 | Authorized Trade Execution |
| VS-07 | Notifications |
| VS-08 | Supporting Investment Features |
| VS-09 | Integration and Final Validation |

These are proposed implementation groupings, not new architectural decisions.

## 3. Functional Requirements

| ID | Requirement | Proposed Slice | Verification |
|---|---|---|---|
| FR-01 | Generate Advisory Signals | VS-03 | Signal generation tests |
| FR-02 | Deliver Notifications | VS-07 | Notification delivery tests |
| FR-03 | Provide Bilingual Risk Context | VS-03 | English/Urdu content tests |
| FR-04 | Enforce Signal Validity and Price-Shift Rules | VS-02, VS-03, VS-06 | Validity and price-shift tests |
| FR-05 | Configure and Approve Capital Allocation | VS-04 | Allocation and approval tests |
| FR-06 | Schedule Tranches and Require Individual Authorization | VS-05 | Scheduling and authorization tests |
| FR-07 | Expire and Skip Unauthorized Tranches | VS-05 | Expiry and skip tests |
| FR-08 | Pause, Cancel, Restart, or Adjust a Plan | VS-04, VS-05 | Plan lifecycle tests |
| FR-09 | Pause an Active Plan | VS-04 | Pause tests |
| FR-10 | Cancel Remaining Tranches | VS-04, VS-05 | Cancellation tests |
| FR-11 | Restart or Adjust a Plan | VS-04, VS-05 | Restart and adjustment tests |
| FR-12 | Detect High Volatility and Suppress Buy Signals | VS-02, VS-03 | Volatility tests |
| FR-13 | Calculate and Display Signal Accuracy | VS-03, VS-08 | Accuracy calculation tests |
| FR-14 | Enforce Exchange API Key Permissions | VS-01, VS-06 | Permission verification tests |
| FR-15 | Personal Digital-Asset Watchlist | VS-08 | Watchlist CRUD and isolation tests |
| FR-16 | Executed Trade History and CSV Export | VS-08 | Read-only history and export tests |
| FR-17 | Private Investment Decision Journal | VS-08 | Privacy and CRUD tests |

Requirement titles must be checked against the approved PRD before final approval.

## 4. Non-Functional Requirements

| ID | Requirement | Proposed Slice | Verification |
|---|---|---|---|
| NFR-01 | Signal Processing and Validity Verification | VS-02, VS-03 | Performance and validity tests |
| NFR-02 | Authorization and Permission Security | VS-01, VS-05, VS-06 | Security tests |
| NFR-03 | Bilingual Usability | VS-03, VS-07 | Localization and usability tests |
| NFR-04 | Notification Delivery | VS-07 | Delivery and failure tests |

## 5. Business Rules

The following IDs must be reconciled against the exact business-rule
definitions in the approved PRD. No descriptions are invented here.

| ID | Source | Proposed Verification |
|---|---|---|
| BR-01 | PRD business rule — exact text to verify | Rule-specific test |
| BR-02 | PRD business rule — exact text to verify | Rule-specific test |
| BR-03 | PRD business rule — exact text to verify | Rule-specific test |
| BR-04 | PRD business rule — exact text to verify | Rule-specific test |
| BR-05 | PRD business rule — exact text to verify | Rule-specific test |
| BR-06 | PRD business rule — exact text to verify | Rule-specific test |
| BR-07 | PRD business rule — exact text to verify | Rule-specific test |
| BR-08 | PRD business rule — exact text to verify | Rule-specific test |
| BR-09 | PRD business rule — exact text to verify | Rule-specific test |
| BR-10 | PRD business rule — exact text to verify | Rule-specific test |
| BR-11 | PRD business rule — exact text to verify | Rule-specific test |
| BR-12 | PRD business rule — exact text to verify | Rule-specific test |

## 6. Constraints

### 6.1 PRD constraints

| ID | Source | Verification |
|---|---|---|
| C-01 | Exact PRD definition to verify | Source-specific test |
| C-02 | Exact PRD definition to verify | Source-specific test |
| C-03 | Exact PRD definition to verify | Source-specific test |
| C-04 | Exact PRD definition to verify | Source-specific test |
| C-05 | Exact PRD definition to verify | Source-specific test |
| C-06 | Exact PRD definition to verify | Source-specific test |

### 6.2 Cross-cutting constraints

| ID | Constraint | Verification |
|---|---|---|
| XC-01 | Strict greater-than threshold semantics | Boundary-value tests |
| XC-02 | No autonomous execution | Authorization and scheduler tests |
| XC-03 | Append-only execution ledger | Persistence and immutability tests |
| XC-04 | Zero withdrawal capability | API and SDK inspection |
| XC-05 | Server-side 60-second authorization cutoff | Expiry and server-clock tests |
| XC-06 | Market data lockout for stale data or ticker lag | Freshness and latency tests |
| XC-07 | Non-retroactive plan resumption | Resume lifecycle tests |
| XC-08 | Preserve unresolved open questions | Requirements and decision-log review |
| XC-09 | Urdu translation fallback | Translation failure tests |
| XC-10 | Provider acceptance is not device delivery | Notification status tests |
| XC-11 | Reject keys with unverifiable permissions | API key verification tests |
| XC-12 | Exact source definition to be verified | Source-specific verification |

XC-12 must be checked against the approved baseline. Its wording is deliberately not inferred here.

## 7. Architectural Decision Traceability

| ADR | Decision Area | Related Implementation Areas |
|---|---|---|
| ADR-001 | Overall architectural style | All slices |
| ADR-002 | Component and module boundaries | All slices |
| ADR-003 | Data persistence and schema ownership | VS-04, VS-05, VS-06, VS-08 |
| ADR-004 | Authentication and trade authorization boundary | VS-01, VS-05, VS-06 |
| ADR-005 | External integration boundaries and decoupled messaging | VS-02, VS-06, VS-07, VS-09 |

## 8. Open Questions

The baseline identifies the following open questions as unresolved:

- OQ-01
- OQ-04
- OQ-05
- OQ-07
- OQ-08
- OQ-09

Their exact wording and ownership must be copied from the approved source.
No implementation assumption may silently resolve them.

## 9. Mandatory Verification Rules

1. Verify all requirement titles and descriptions against PRD.md.
2. Verify C-01 through C-06 against their exact source definitions.
3. Verify XC-12 against the approved baseline.
4. Confirm every mapping with the approved ADRs and architecture documents.
5. Add test case IDs when test specifications are prepared.
6. Record all changes and obtain human approval where required.

## 10. Approval Status

**Status:** Draft — Not yet approved for implementation.

Human review and validation against the complete Deliverable 3 baseline are required.
