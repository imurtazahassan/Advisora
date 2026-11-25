# Deliverable 4 — Acceptance Criteria

**Project:** Human-Controlled Digital-Asset Advisory Application
**Version:** 1.0
**Status:** Baseline for implementation and verification

## 1. Purpose

Define measurable conditions for accepting each of the nine vertical slices. Code being written does not mean a slice is accepted. Required tests must pass and evidence must be recorded.

## 2. Acceptance Statuses

- NOT STARTED
- IN PROGRESS
- IMPLEMENTED
- TESTING
- ACCEPTED
- BLOCKED

## 3. Vertical Slice Acceptance Criteria

### VS-01 — User Access and Device Security

- AC-01.1: Users can register with valid information.
- AC-01.2: Registered users can log in.
- AC-01.3: Invalid credentials are rejected.
- AC-01.4: Passwords are securely hashed.
- AC-01.5: Protected endpoints reject unauthenticated requests.
- AC-01.6: Users can terminate sessions.
- AC-01.7: Device-bound authorization is verified server-side using the registered device public key.
- AC-01.8: Unauthorized access tests pass.

Evidence: Authentication tests, security tests and screenshots.

### VS-02 — Market Data and Asset Eligibility

- AC-02.1: Market data is obtained from the configured provider or identified test-data source.
- AC-02.2: Relevant asset prices are displayed.
- AC-02.3: Data older than 15 seconds is classified as stale.
- AC-02.4: Ticker latency above 5 seconds locks Buy.
- AC-02.5: Ineligible assets cannot proceed through actionable advisory workflows.
- AC-02.6: Missing and invalid market data is handled safely.
- AC-02.7: Test data is distinguishable from live provider data.

Evidence: Dashboard screenshots and market-data tests.

### VS-03 — Advisory Signal Generation

- AC-03.1: Signals are generated using documented business rules.
- AC-03.2: Each signal identifies its asset.
- AC-03.3: Each signal includes an understandable explanation.
- AC-03.4: Signal history is available.
- AC-03.5: Incomplete market data cannot generate an actionable Buy signal.
- AC-03.6: Accuracy reporting displays its sample size.
- AC-03.7: Insufficient evaluation data is clearly identified.

Evidence: Signal examples and advisory tests.

### VS-04 — Investment Plan Management

- AC-04.1: Users can create investment plans.
- AC-04.2: Allocation cannot exceed 5% of applicable available capital.
- AC-04.3: Plans contain three equal tranches rounded down to the smallest currency unit.
- AC-04.4: Users can view plan details.
- AC-04.5: Users can pause plans.
- AC-04.6: Creating or approving a plan executes zero trades.
- AC-04.7: Plan information is protected against unauthorized access.

Evidence: Plan screenshots, allocation tests and zero-execution verification.

### VS-05 — Tranche Scheduling and Human Authorization

- AC-05.1: Three tranches are scheduled for each plan.
- AC-05.2: Every tranche requires separate explicit human authorization.
- AC-05.3: Authorization is bound to its specific tranche.
- AC-05.4: Authorization expires after 60 seconds using trusted server-side time.
- AC-05.5: Expired authorization cannot be reused.
- AC-05.6: An upward price movement strictly greater than 2% invalidates the relevant authorization.
- AC-05.7: Exactly 2% does not trigger that invalidation rule.
- AC-05.8: Pausing revokes outstanding authorization prompts.
- AC-05.9: Missed or expired tranches are permanently skipped.
- AC-05.10: Resuming does not backfill missed tranches.
- AC-05.11: Future tranches require fresh authorization.

Evidence: Scheduling, expiry, price movement and pause/resume tests.

### VS-06 — Authorized Trade Execution

- AC-06.1: Execution requires valid authorization for the specific tranche.
- AC-06.2: Unauthorized execution requests are rejected by the backend.
- AC-06.3: Expired authorization cannot authorize execution.
- AC-06.4: Successful simulated executions create records.
- AC-06.5: Duplicate requests cannot create duplicate executions.
- AC-06.6: Execution records are append-only.
- AC-06.7: Failed or uncertain executions are handled safely.
- AC-06.8: Outages do not trigger automatic execution after authorization expiry.
- AC-06.9: No real-money or live exchange trades are performed.

Evidence: Execution tests, simulated history and ledger integrity tests.

### VS-07 — Notifications

- AC-07.1: Relevant system events generate notifications.
- AC-07.2: Notification failure does not interrupt core functionality.
- AC-07.3: Notification messages are understandable.
- AC-07.4: Dispatch outcomes are recorded.
- AC-07.5: At least 95% of 1,000 test dispatches per configured channel achieve provider acceptance within 10 seconds.
- AC-07.6: Provider acceptance is not represented as confirmed device delivery.
- AC-07.7: Provider outages have appropriate fallback behavior.

Evidence: Notification logs and performance reports.

### VS-08 — Supporting Investment Features

- AC-08.1: Users can maintain watchlists.
- AC-08.2: Users can view watchlist entries.
- AC-08.3: Users can view simulated trade history.
- AC-08.4: Users can create and view journal notes.
- AC-08.5: Historical execution records cannot be modified through ordinary application operations.
- AC-08.6: Users can access only their own protected information.

Evidence: Feature screenshots and access-control tests.

### VS-09 — Integration and Final Validation

- AC-09.1: All vertical slices integrate successfully.
- AC-09.2: Core user workflows work end to end.
- AC-09.3: Automated unit and integration tests pass.
- AC-09.4: Security and authorization requirements are verified.
- AC-09.5: Quality targets are measured and reported.
- AC-09.6: Application setup instructions are tested.
- AC-09.7: Critical defects are resolved.
- AC-09.8: A complete simulated-activity demonstration succeeds.
- AC-09.9: Implementation and testing evidence is organized.

Evidence: Integration report, final screenshots and demonstration checklist.

## 4. Project Quality Acceptance Criteria

| ID | Quality area | Target |
|---|---|---|
| QAC-01 | Usability | At least 90% of representative users complete core tasks unassisted |
| QAC-02 | Accessibility | WCAG 2.1 AA |
| QAC-03 | API reliability | At least 99.5% eligible responses under defined tests |
| QAC-04 | API performance | p95 below 500 ms for ordinary requests |
| QAC-05 | Human authorization | 100% of simulated tranche orders require individual authorization |
| QAC-06 | Error handling | Understandable errors and safe recovery |

Measurement methods, test environments and sample sizes must be documented.

## 5. Evidence Requirements

Each slice must have its own evidence folder containing:

- ACCEPTANCE_REPORT.md
- TEST_RESULTS.md
- screenshots/
- Implementation notes
- Defects and limitations
- Final acceptance decision

Only actual test results may be reported as passed.

## 6. Acceptance Rules

A slice can be marked ACCEPTED only when:

1. All mandatory acceptance criteria pass.
2. Relevant automated tests have been executed.
3. Critical defects are resolved.
4. Evidence is recorded.
5. Requirements traceability is updated.
6. The acceptance report records the decision.

## 7. Outstanding Decisions

The following details must be resolved through the approved project decision process:

- Global spot-volume ranking source and liquidity thresholds.
- Volatility reference price, rolling window and reset logic.
- Minimum allocation and numeric precision.
- Signal accuracy outcome definition, evaluation horizon and minimum sample size.
- Device registration, key rollover and lost-device recovery.
- Production exchange provider selection.

These details must not be silently invented during implementation.

## 8. Traceability and Change Control

Every acceptance criterion must be linked to its corresponding functional requirement, non-functional requirement, business rule or architecture decision.

Changes must be documented and reviewed.

## 9. Final Acceptance

Deliverable 4 is accepted only when all nine slices are implemented and verified, integration and quality tests are completed, evidence is available, and the final demonstration succeeds.

**Final project status: PENDING IMPLEMENTATION AND VERIFICATION**
