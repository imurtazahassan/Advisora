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
7. Migration execution for PostgreSQL migrations `001`–`006`, database-backed integration tests, and full end-to-end slice acceptance remain outstanding. The configured backend unit and smoke-E2E suites, backend/frontend production builds, and lint were run on 2026-11-26; exact commands and results are recorded in `docs/evidence/VS-09/TEST_RESULTS.md`.

## Scheduler hardening added after the integrated snapshot

- Authorization expiry is now persisted relative to the scheduled tranche timestamp so a delayed scheduler worker cannot silently grant a new 60-second window to an already-missed slot.
- Due-window opening and its in-app outbox event are committed in one SQL statement; missed and expired skip events use the same transactional outbox pattern.
- Missed scheduled slots and expired authorization windows transition to `SKIPPED` permanently.
- Pause revokes open prompts. Resume permanently skips tranches whose scheduled time passed while paused, then schedules only future eligible tranches at the next applicable 24-hour intervals; it does not immediately backfill missed intervals.
- Added a pure policy classifier and boundary tests for waiting, authorization-eligible, and missed schedule windows.
- Plan adjustment now cancels the previous remainder and inserts the replacement plan/tranches in one database transaction, preventing a failed replacement from leaving the previous plan cancelled.
- Detailed behavior and boundary cases are recorded in `docs/VS05_SCHEDULER_HARDENING.md`.

## Verification status in this environment (updated 2026-11-26)

- **Build (`npm run build`)**: Passed (0 errors across Vite frontend and NestJS backend).
- **Builds:** Backend NestJS build and frontend TypeScript/Vite production build passed on 2026-11-26.
- **Lint:** Backend and frontend lint commands exited successfully with 8 and 2 warnings respectively; warning details are in the VS-09 test results.
- **Backend unit tests:** 7/7 suites and 42/42 tests passed on 2026-11-26.
- **Backend E2E:** 2/2 suites and 5/5 tests passed on 2026-11-26, covering smoke routing and VS-01 auth flows, not complete VS-02–VS-09 workflows.
- **PostgreSQL Database & Migrations (`001`–`006`):** A PostgreSQL service is present, but the documented default credentials fail with SQLSTATE `28P01`; no migrations were applied. Migrations and live database integration/immutability checks remain unverified. See `docs/evidence/VS-09/TEST_RESULTS.md`.

## AI Studio Runtime Migration (Development / Demo-Only)

- Added root `package.json` orchestrating `backend/` and `frontend/` build, lint, test, and single-process port 3000 startup (`0.0.0.0`), with `frontend/dist` served statically by NestJS (`backend/src/main.ts`) and same-origin `API` default in `frontend/src/App.tsx`.
- Swapped native `bcrypt` to pure-JS `bcryptjs` (`backend/package.json`, `backend/src/auth/auth.service.ts`, `backend/src/users/users.service.ts`) preserving cost factor 12.
- Added a development/demo-only in-memory PostgreSQL adapter (`backend/src/database/in-memory-pg.ts`, wired in `backend/src/database/database.module.ts`). PostgreSQL remains the authoritative persistent database architecture (ADR-003).
  - **Strict Fail-Closed Guard:** The in-memory fallback is permitted ONLY when `NODE_ENV` is `development` or `test` and either `USE_IN_MEMORY_DB=true`, `DB_HOST` is unset, or the exact unconfigured `.env.example` placeholder (`localhost` / `postgres` / `advisora` / `change_me`) receives `ECONNREFUSED`. Any custom `DB_HOST`/`DB_NAME`/`DB_USER`/non-placeholder `DB_PASSWORD`, `USE_IN_MEMORY_DB=false`, PostgreSQL auth/DB errors (`28P01`, `3D000`), or non-dev/test `NODE_ENV` (`production`, etc.) fails loudly at startup.
  - **Data Volatility:** All in-memory state (users, sessions, devices, plans, tranches, ticks, trades, watchlists, journal notes, notifications) is non-persistent and lost on process restart.
- Added a development/test-only ephemeral `JWT_SECRET` fallback in `backend/src/auth/auth.module.ts` (`NODE_ENV` = `development` or `test`); non-dev/test startup fails closed if `JWT_SECRET` is missing or a placeholder.
- Fixed NestJS DI export of `JwtModule` in `backend/src/auth/auth.module.ts`, TypeScript `TS1272` `import type` annotations across controllers/services, and Jest ESM support (`backend/jest.config.ts`, `backend/jest.setup.ts`, `backend/test/jest-e2e.json`).

**Acceptance status:** Runtime adaptation is conditionally approved for development/demo execution only. VS-01 has a previously recorded human acceptance under its documented dev/test in-memory baseline. VS-02 through VS-09 remain unaccepted pending slice-specific acceptance evidence, PostgreSQL verification where applicable, and human review.
