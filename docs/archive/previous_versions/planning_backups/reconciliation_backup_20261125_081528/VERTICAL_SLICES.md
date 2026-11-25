# Vertical Slice Plan

> Status: Draft — requires team review and approval.
> Source baseline: Deliverable 3 PRD, architecture, and approved ADRs.

## VS-01 — User Access and Device Security
**Scope**
- User registration and authentication.
- Session management.
- Device registration and authorization.
- Secure credential-management foundation.

**Acceptance criteria**
- Unauthorized users cannot access protected functionality.
- Device authorization is enforced where required.
- Sensitive credentials are not exposed in application responses or logs.

## VS-02 — Market Data and Asset Eligibility
**Scope**
- Market-data ingestion.
- Market-data validity and freshness checks.
- Asset eligibility and volatility evaluation.

**Acceptance criteria**
- Invalid or stale market data is detected.
- Ineligible assets are prevented from progressing to advisory generation.
- Market-data failures are handled safely.

## VS-03 — Advisory Signal Generation
**Scope**
- Advisory signal generation.
- Entry price and target information.
- Risk context and bilingual explanations.
- Signal validity and invalidation.

**Acceptance criteria**
- A signal contains the information required by the PRD.
- Expired or invalidated signals cannot be used.
- The system remains advisory-only.

## VS-04 — Investment Plan Management
**Scope**
- Investment plan creation.
- Capital allocation.
- Plan review and approval.
- Plan status management.

**Acceptance criteria**
- Plans follow approved allocation rules.
- Users can review plan details before approval.
- Plan state changes are recorded.

## VS-05 — Tranche Scheduling and Human Authorization
**Scope**
- Tranche scheduling.
- Individual tranche authorization.
- Authorization expiry.
- Pause, cancellation, and applicable resume behavior.

**Acceptance criteria**
- Every tranche requires fresh explicit human authorization.
- Expired authorization cannot be reused.
- No tranche proceeds without valid authorization.

## VS-06 — Authorized Trade Execution
**Scope**
- Execution through the approved exchange integration.
- Execution status tracking.
- Trade records and failure handling.

**Acceptance criteria**
- Execution is possible only after valid authorization.
- Execution outcomes are recorded.
- Withdrawals and transfers are prohibited.
- The application never performs autonomous trading.

## VS-07 — Notifications
**Scope**
- Advisory notifications.
- Authorization-related notifications.
- Delivery tracking.
- English and Urdu explanations as required.

**Acceptance criteria**
- Notification content follows approved requirements.
- Delivery attempts and outcomes are tracked.
- Notification failures do not silently change trade authorization.

## VS-08 — Supporting Investment Features
**Scope**
- Watchlist.
- Trade history.
- CSV export.
- Investment journal.
- Signal-accuracy presentation.

**Acceptance criteria**
- Supporting features use authorized and recorded application data.
- Users can access their relevant historical information.
- Exported information is consistent with stored records.

## VS-09 — Integration and Final Validation
**Scope**
- Cross-module integration.
- End-to-end workflows.
- Functional, boundary, negative, and security tests.
- Practical NFR validation.
- Local deployment and final documentation.

**Acceptance criteria**
- Core workflows operate across integrated modules.
- Critical authorization and safety rules are verified.
- Known limitations and unresolved issues are documented.
- The application can be run using the documented local setup.

## Implementation Notes
- These slices are a proposed implementation breakdown, not new approved requirements.
- Confirm exact FR, NFR, BR, and constraint references against the Deliverable 3 baseline.
- Resolve relevant open questions before implementing affected behavior.
- Record human acceptance or revision for every completed slice.
