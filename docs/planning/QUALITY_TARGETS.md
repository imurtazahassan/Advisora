# Additional Quality Targets — OQ-09

**Project:** Human-Controlled Digital-Asset Advisory Application
**Source:** Explicitly accepted OQ-09 Option A
**Status:** Approved planning targets; verification evidence pending

These targets supplement NFR-01 through NFR-04. They do not replace or weaken existing requirements.

## QT-01 — Core Task Usability

**Target:** At least 90% of representative usability-test participants complete the defined core tasks without assistance.

**Verification:**
- Define representative participant and task profiles.
- Record successful unassisted task completion.
- Report sample size and completion rate.

## QT-02 — Accessibility

**Target:** WCAG 2.1 Level AA for the web interface.

**Verification:**
- Conduct automated accessibility checks.
- Conduct manual keyboard and screen-reader checks.
- Document identified violations and remediation.

## QT-03 — API Reliability

**Target:** At least 99.5% successful responses for eligible application API requests under documented test conditions.

**Verification:**
- Define eligible requests and excluded responses.
- Record test workload and duration.
- Report successful responses and total eligible requests.
- Do not count rejected unauthorized requests as reliability failures.

## QT-04 — API Performance

**Target:** 95th-percentile response time below 500 ms for ordinary application API requests.

**Verification:**
- Define the ordinary API request set.
- Document hardware, workload, concurrency and test duration.
- Report percentile measurements.

This target does not override the existing market-data freshness or 60-second authorization requirements.

## QT-05 — Error Recovery

**Target:** Failed operations must provide understandable error information and a safe recovery path. Failures must not silently authorize, duplicate or execute a trade.

**Verification:**
- Exercise defined failure and recovery scenarios.
- Confirm errors are understandable.
- Confirm authorization and execution safety invariants remain enforced.

## QT-06 — Human Authorization Enforcement

**Target:** 100% enforcement of successful individual human authorization before every simulated tranche order.

**Verification:**
- Test missing, invalid, expired and revoked authorization.
- Test duplicate and concurrent submission attempts.
- Verify no unauthorized simulated order is accepted.

## Relationship to Existing NFRs

- NFR-01 remains unchanged.
- NFR-02 remains unchanged.
- NFR-03 remains unchanged.
- NFR-04 remains unchanged, including at least 95% provider acceptance within 10 seconds across 1,000 dispatch attempts per configured channel.

## Measurement Qualification

All quality measurements must identify their workload, environment, sample size, exclusions and test method.

These targets are planning acceptance criteria. Actual achievement must not be claimed until test evidence exists.