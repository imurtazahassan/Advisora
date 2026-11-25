# ADVISORA Integrated Implementation — Status and Limitations

Date: 2026-11-25

This package integrates the uploaded project baseline with implementation work across the planned nine slices. It is an implementation snapshot, not an accepted or production-ready release.

## Implemented source areas

| Slice | Added source | Current status |
|---|---|---|
| VS-01 | Authentication, sessions, device registration and device proof-of-possession | Existing implementation retained; build, DB and tests pending; native biometric integration not complete |
| VS-02 | Simulated market feed, persistence, freshness/latency policy | Existing implementation retained; eligibility policy remains pending; integration tests pending |
| VS-03 | Signal policy/history/accuracy foundation | Signal generation intentionally fail-closed while target-yield and volatility calculation details remain unresolved |
| VS-04 | Plans, allocation, three tranche creation, pause/resume/cancel/adjust | Added; DB/build/test verification pending |
| VS-05 | Background scheduler, expiry/skip, signed challenge gate | Added; native biometric and recovery flows incomplete; verification pending |
| VS-06 | Guarded simulated execution, unique tranche execution, append-only ledger | Added; no live exchange integration; requires valid linked signal; verification pending |
| VS-07 | In-app notification outbox/history | Added; WhatsApp/push providers and NFR-04 measurement not implemented |
| VS-08 | Watchlist, journal, trade history and CSV export | Added; outcome evaluation/accuracy remains limited by VS-03 unresolved decisions |
| VS-09 | Module integration, migration runner, dashboard and evidence docs | Added; full build, DB and E2E verification pending |

## Safety boundaries preserved

- Plan approval creates a plan and schedule only; it does not create a trade.
- Scheduler opens and expires authorization windows but never executes trades.
- Each simulated execution requires a fresh, one-time device signature challenge.
- Authorization is rechecked server-side against the 60-second deadline.
- Market data older than 15 seconds or ticker latency greater than 5 seconds locks execution.
- Upward price movement strictly greater than 2% invalidates the execution attempt; exactly 2% does not trigger this rule.
- No withdrawal or transfer endpoint or model is included.
- Simulated trade records are protected against UPDATE and DELETE in PostgreSQL.
- No live exchange API key or credential is collected by this implementation.

## Outstanding approved specifications / integration

1. VS-03 target profit yield and volatility reference/window/reset rules are not specified sufficiently to generate valid recommendations. Signal generation stays disabled.
2. Liquidity threshold, global volume ranking source and objective high-risk asset criteria remain open.
3. Native OS biometric/PIN flow, secure-enclave key custody and PIN recovery OTP require a native client/platform integration.
4. Production exchange provider remains unselected; API permission inspection and secret storage are not implemented. Unverifiable permissions must remain inactive.
5. WhatsApp and mobile push providers, Urdu fallback dispatch and NFR-04 provider-acceptance measurement are not implemented.
6. Initial tranche schedule anchor and currency precision need owner confirmation. Current demo uses plan approval timestamp and 2-decimal USDT precision as explicit implementation assumptions only.
7. PostgreSQL migrations, full TypeScript build, Jest suite, frontend build, API integration tests and end-to-end tests remain to be run in the user's environment.

## Scheduler hardening added after the integrated snapshot

- Authorization expiry is now persisted relative to the scheduled tranche timestamp so a delayed scheduler worker cannot silently grant a new 60-second window to an already-missed slot.
- Due-window opening and its in-app outbox event are committed in one SQL statement; missed and expired skip events use the same transactional outbox pattern.
- Missed scheduled slots and expired authorization windows transition to `SKIPPED` permanently.
- Pause revokes open prompts. Resume permanently skips tranches whose scheduled time passed while paused, then schedules only future eligible tranches at the next applicable 24-hour intervals; it does not immediately backfill missed intervals.
- Added a pure policy classifier and boundary tests for waiting, authorization-eligible, and missed schedule windows.
- Plan adjustment now cancels the previous remainder and inserts the replacement plan/tranches in one database transaction, preventing a failed replacement from leaving the previous plan cancelled.
- Detailed behavior and boundary cases are recorded in `docs/VS05_SCHEDULER_HARDENING.md`.

## Verification attempted in this environment

- Backend `npm ci --ignore-scripts --no-audit --no-fund` timed out in this environment; dependencies were not installed.
- Global TypeScript compiler cannot run project type-check because `@types/node` and `@types/jest` are not installed.
- No PostgreSQL server/client is available here; migrations were not applied.

Do not describe any vertical slice as accepted until the required tests and human review pass.
