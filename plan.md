# Implementation Plan

**Project:** Human-Controlled Digital-Asset Advisory Application (ADVISORA)  
**Course:** SE-1001 — Introduction to Software Engineering  
**Deliverable:** 4 — AI-Native Development & Final Product  
**Version:** 0.3 (Stage 2 Validated Plan)  
**Status:** Stage 2 Approved; **VS-01 ACCEPTED (2026-11-25)** — Awaiting VS-02 Authorization (`VS-02`–`VS-09` Not Accepted)  
**Prior Versions:** `docs/archive/previous_versions/plan-v01.md` (v0.1), `docs/archive/previous_versions/plan-v02.md` (v0.2)

---

## 1. Product Objective

Deliver a working, traceable, human-controlled digital-asset advisory web application that:

1. Strictly adheres to the approved Deliverable 3 PRD (`FR-01`–`FR-17`, `NFR-01`–`NFR-04`, `BR-01`–`BR-12`, `C-01`–`C-06`, `XC-01`–`XC-12`), architecture (`ASR-01`–`ASR-13`, `ADR-001`–`ADR-005`), and accepted Deliverable 4 decisions (`OQ-01`, `OQ-04`, `OQ-05`, `OQ-07`, `OQ-08`, `OQ-09`).
2. Never performs autonomous trading, never places trades upon plan approval or scheduler ticks, and never exposes withdrawal or transfer functionality.
3. Validates, tests, documents, and obtains human acceptance incrementally across all nine vertical slices (`VS-01` through `VS-09`) before claiming completion.

---

## 2. Source of Truth and Architectural Baseline

The following approved artefacts govern implementation and cannot be silently overridden:

- `docs/baseline/deliverable-3/PRD.md` (`FR-01`–`FR-17`, `NFR-01`–`NFR-04`, `BR-01`–`BR-12`, `E-01`–`E-46`, `C-01`–`C-06`, `XC-01`–`XC-12`, `OQ-02`, `OQ-03`, `OQ-06`)
- `docs/baseline/deliverable-3/architecture.md` and `docs/architecture/ARCHITECTURE_BASELINE.md`
- `docs/baseline/deliverable-3/ADR/ADR-001` through `ADR-005`
- `docs/baseline/deliverable-3/AGENTS.md` and `backend/AGENTS.md`
- `docs/planning/DECISION_REGISTER.md`, `VERTICAL_SLICES.md`, `DEPENDENCY_MATRIX.md`, `ACCEPTANCE_CRITERIA.md`, `QUALITY_TARGETS.md`, `TRACEABILITY_MATRIX.md`

### Architectural Rules (Mandatory)
- **ADR-001:** Modular Monolith with Ports & Adapters (`TypeScript`, `NestJS`, `React`, `PostgreSQL`).
- **ADR-002:** Strict module boundaries (8 core domain modules + 3 isolated TA supporting modules: `watchlist`, `trade_history`, `investment_journal`).
- **ADR-003:** Single relational PostgreSQL database with module-owned tables/repositories, ACID transactions, optimistic locking (`version_id`), and strictly append-only execution ledger (`XC-03`). **No Redis**; **no shared database client in `common/`**; relational DB-backed scheduling.
- **ADR-004:** Four-stage authorization separation (Session auth != Device verification != Tranche authorization != Execution); server-side 60-second TTL (`XC-05`).
- **ADR-005:** External integrations (exchange market stream, trade execution, WhatsApp/push notifications) isolated behind Ports & Adapters + Transactional Outbox.

---

## 3. Non-Negotiable Safety Rules

1. **Human Authorization (`C-01`, `XC-02`, `ADR-004`):** Plan approval executes **zero trades**. Scheduler ticks only open/expire authorization windows; they never place orders. Every tranche requires separate explicit human authorization completed within **60 seconds** (`serverTime <= expiresAt`).
2. **Capital & Tranche Rules (`FR-05`, `BR-01`, `BR-02`, `OQ-02`):** Maximum allocation is **5%** of connected exchange available quote-asset balance (excluding external wallets). Plans contain **3 equal tranches** rounded down to the smallest currency unit, scheduled at fixed **24-hour intervals**.
3. **Price-Shift & Market Safety (`FR-04`, `FR-12`, `BR-04`, `BR-05`, `XC-01`, `XC-06`):**
   - Market data older than **15 seconds** locks Buy (`Market Data Unavailable`).
   - Ticker latency **> 5 seconds** locks Buy.
   - Upward price movement strictly **> 2.0%** invalidates authorization (`2.0%` exact does NOT trigger).
   - 1-hour movement strictly **> 5.0%** triggers volatility suppression (`5.0%` exact does NOT trigger).
4. **Pause / Resume / Cancel (`FR-08`–`FR-11`, `OQ-05`, `XC-07`):** Pause preserves executed tranches and revokes open authorization prompts. Expired/missed tranches transition permanently to `SKIPPED` and are **never backfilled**; resume schedules only future tranches on the next applicable 24-hour interval.
5. **Exchange Security & Ledger (`FR-14`, `BR-11`, `XC-03`, `XC-04`, `XC-11`):** Zero withdrawal/transfer endpoints, SDK calls, or models. Exchange keys with withdrawal permissions enabled or unverifiable remain rejected/inactive. Execution records are strictly **append-only** (no `UPDATE` or `DELETE`).
6. **Reporting-Only Loss Threshold (`FR-13`, `XC-12`):** The strictly **> 3%** drop threshold is Signal Accuracy measurement-only (`3.0%` exact does not breach) and never triggers stop-loss or forced closure.

---

## 4. Implementation Assumptions (Explicitly Documented)

1. **Simulated Execution & Market Adapter (`OQ-01`):** Until a production exchange provider is approved and selected, market ingestion (`SimulatedMarketDataProvider`) and order placement (`SimulatedExchangeAdapter`) operate in strictly simulated mode (`execution_mode = 'SIMULATED'`). No real funds or live exchange credentials are used.
2. **Development/Demo In-Memory PostgreSQL Fallback (`DatabaseModule`):** PostgreSQL remains the authoritative persistent database under `ADR-003`. For local AI Studio container execution where no Postgres daemon is running, `backend/src/database/in-memory-pg.ts` provides a strictly non-persistent dev/demo fallback **only** when `NODE_ENV` is `development` or `test` AND either `USE_IN_MEMORY_DB=true`, `DB_HOST` is unset, or the exact unconfigured `.env.example` placeholder (`localhost`/`postgres`/`advisora`/`change_me`) receives `ECONNREFUSED`. Any custom DB host/credentials, `USE_IN_MEMORY_DB=false`, SQLSTATE auth/DB error (`28P01`, `3D000`), or non-dev/test `NODE_ENV` fails loudly at startup. All in-memory data is lost on restart.
3. **Development-Only Ephemeral `JWT_SECRET`:** Ephemeral random runtime JWT signing keys are generated only when `NODE_ENV` is `development` or `test` and `JWT_SECRET` is unset or a placeholder. Non-dev/test startup requires a configured persistent `JWT_SECRET`.
4. **Web Device Proof vs. Native OS Biometrics (`OQ-06`, `ADR-004`):** In the web runtime, device trust uses Ed25519 public-key registration and one-time server challenge signatures as the cryptographic web proof-of-possession layer. Native Face ID / Touch ID and hardware secure-enclave custody require a native/mobile platform client and are not claimed complete in this web build.
5. **Currency Precision & Initial Schedule Anchor:** While minimum allocation and precision remain open in `PLAN_REVIEW_NOTES.md`, the current demo implementation uses **2-decimal USDT** precision (rounded down) and anchors Tranche 1 at `approvalTime + 24h`, Tranche 2 at `+48h`, Tranche 3 at `+72h`.
6. **Runtime Single-Origin Serving:** In the AI Studio web runtime, NestJS serves `frontend/dist` statically alongside API routes on port `3000` (`0.0.0.0`), using `bcryptjs` (cost factor 12) for pure-JS password hashing portability.

---

## 5. Identified Contradictions, Open Issues, and Blockers

### 5.1 Document / Code Contradictions (Flagged — Not Silently Resolved)
1. **VS-01 Password Minimum Length (`10` vs `12`) — RESOLVED via `ED-01`:**
   - Under Human-Delegated Engineering Authority (`docs/planning/DECISION_REGISTER.md` -> `ED-01`), registration password minimum is set to **12 characters** as an explicit engineering decision filling an unspecified baseline requirement (without altering original baseline docs).
   - Backend (`backend/src/auth/auth.service.ts`), frontend (`frontend/src/App.tsx`), 11/12/13 BVA tests, and VS-01 evidence docs are aligned; `login` preserves compatibility for existing valid accounts.
2. **ADR-002 / ADR-003 Module Consolidation & Cross-Table Queries in Integrated Snapshot:**
   - `ADR-002` specifies 8 core + 3 separate TA modules (`watchlist`, `trade_history`, `investment_journal`), and `ADR-003` prohibits modules from querying tables owned by other modules directly.
   - In the pre-existing `backend/src/` snapshot: `SupportingModule` combines notifications, watchlist, journal, and trade history (joining `simulated_trades` directly with `market_assets`); `ExecutionService` queries `investment_tranches`, `market_assets`, `market_ticks`, `advisory_signals`, and `simulated_trades` directly; `PlansModule` combines plan management and tranche scheduling.
   - Note: `VS-01` (`AuthModule` + `UsersService`) is cleanly isolated on `users`, `user_sessions`, `user_devices`, `device_registration_challenges`, and `device_authorization_challenges`. Later slices (`VS-04`–`VS-08`) require either repository-port refactoring or formal human waiver of ADR-002/003 granularity.
3. **Plan / Tracker State Discrepancy:**
   - Pre-existing snapshot added source files across all 9 slices (`VS-01`–`VS-09`) and created initial evidence drafts, yet `plan.md` §17 Readiness Gate remained unchecked. Incremental verification and human acceptance now govern slice completion: `VS-01` is **ACCEPTED** (2026-11-25), while `VS-02`–`VS-09` remain **NOT ACCEPTED**.

### 5.2 Unresolved Specification Items (`PRD` / `DECISION_REGISTER.md` / `ACCEPTANCE_CRITERIA.md`)
| ID | Open Issue | Impacted Slice(s) | Current Safeguard |
|---|---|---|---|
| OI-01 | Target profit yield formula & rounding (`FR-01`) | VS-03 | `POST /advisories/generate` intentionally fail-closed (`501`/`400`) |
| OI-02 | Volatility 1h reference price, sparse-tick & reset rules (`E-36`, `FR-12`) | VS-02, VS-03 | High-volatility policy helper present; auto-generation blocked |
| OI-03 | Global 24h spot-volume ranking source & high-risk/illiquidity criteria (`FR-01`, `BR-12`) | VS-02, VS-03 | Assets held at `PENDING_POLICY` in `GET /market-data` |
| OI-04 | Allocation minimum & numeric currency precision beyond USDT 2-decimal assumption | VS-04 | Explicitly documented as demo assumption |
| OI-05 | Native OS biometric verification & two-factor OTP PIN recovery (`OQ-06`, `E-45`) | VS-01, VS-05 | Web Ed25519 proof implemented; OTP & native biometrics deferred |
| OI-06 | Device key rollover & lost-device recovery policy (`ADR-004`, `ACCEPTANCE_CRITERIA.md §7`) | VS-01 | Only device registration + revocation implemented |
| OI-07 | Production exchange provider selection & live API permission inspection (`FR-14`, `OQ-01`) | VS-06 | Simulated adapter only; `credential_management` table/port not built |
| OI-08 | Signal Accuracy outcome definition, evaluation horizon & minimum sample size (`OQ-08`) | VS-08 | `GET /advisories/accuracy` handles empty/partial cohort safely |
| OI-09 | WhatsApp / mobile push provider selection, dynamic Urdu fallback & NFR-04 1,000-dispatch benchmark | VS-07 | In-app `notification_outbox` only; provider dispatch unimplemented |
| OI-10 | **Environment Blocker:** PostgreSQL server unavailable in AI Studio container | VS-01–VS-09 | SQL migrations `001`–`006`, DB constraints & immutability triggers require local/CI Postgres verification |

---

## 6. Validated Vertical Slices, Dependencies, Traceability, and Status

### 6.1 Validated Dependency Order (`DEPENDENCY_MATRIX.md`)
1. **VS-01 (User Access and Device Security)** — Depends on: Foundation, `ADR-003`, `ADR-004` -> Prerequisite for all authenticated user flows (`VS-02`, `VS-04`, `VS-05`, `VS-08`).
2. **VS-02 (Market Data and Asset Eligibility)** — Depends on: Foundation, `VS-01` auth -> Prerequisite for `VS-03`, `VS-06`.
3. **VS-03 (Advisory Signal Generation)** — Depends on: `VS-02` -> Prerequisite for `VS-06` (active linked signal) and `VS-07`/`VS-08`. **Currently blocked on OI-01/OI-02/OI-03.**
4. **VS-04 (Investment Plan Management)** — Depends on: `VS-01`, approved allocation rules -> Prerequisite for `VS-05`, `VS-08`.
5. **VS-05 (Tranche Scheduling and Human Authorization)** — Depends on: `VS-04`, `VS-01`, PostgreSQL-backed scheduler -> Prerequisite for `VS-06`, `VS-07`.
6. **VS-06 (Authorized Trade Execution)** — Depends on: `VS-05`, `VS-02`, `VS-03` (linked signal), exchange port -> Prerequisite for `VS-08` trade history.
7. **VS-07 (Notifications)** — Depends on: `VS-03`, `VS-05`, Transactional Outbox (`ADR-005`).
8. **VS-08 (Supporting Investment Features)** — Depends on: `VS-01`, `VS-02` (watchlist prices), `VS-03` (accuracy), `VS-04` (plans), `VS-06` (execution ledger).
9. **VS-09 (Integration and Final Validation)** — Depends on: `VS-01` through `VS-08` + `QUALITY_TARGETS.md` (`QT-01`–`QT-06`).

### 6.2 Nine-Slice Matrix (Traceability, Current Code Status, Integration Status, Testing Expectations)

| Order | Slice | PRD & ADR Refs | Acceptance Criteria | Current Implementation Status | Integration Status | Required Testing & Evidence |
|---|---|---|---|---|---|---|
| 1 | **VS-01** User Access & Device Security | `ASR-08`, `NFR-02`, `ADR-003`, `ADR-004`, `ED-01` | `AC-01.1`–`AC-01.8` | Auth (`ED-01` 12-char min + legacy login compatibility), DB sessions, AuthGuard, Ed25519 challenge/verify/revocation + WebCrypto UI complete; OTP/native bio/rollover deferred. **ACCEPTED (2026-11-25)** | Backend + Frontend auth & Ed25519 device panel integrated on `:3000` (in-memory DB); Postgres `001`–`002` pending | Unit (`42/42` pass), HTTP E2E (`5/5` pass), `:3000` smoke pass; target Postgres verification pending (`OI-10`) |
| 2 | **VS-02** Market Data & Asset Eligibility | `FR-01`, `FR-04`, `FR-12`, `NFR-01`, `BR-04/05/07/12`, `XC-01/06`, `OQ-03`, `ADR-005` | `AC-02.1`–`AC-02.7` | Simulated provider, `003` schema, >15s stale / >5s latency Buy-lock implemented; eligibility intentionally `PENDING_POLICY` (`OI-03`). **NOT ACCEPTED** | Integrated with `GET /market-data`, `POST /market-data/refresh` and React dashboard | `market-data.policy.spec` (passes) + stale/latency boundary & `003` Postgres tests |
| 3 | **VS-03** Advisory Signal Generation | `FR-01`, `FR-03`, `FR-04`, `FR-12`, `NFR-03`, `BR-04/07`, `C-02/06`, `XC-01/09` | `AC-03.1`–`AC-03.7` | `004` schema, 60s expiry & >2% price-shift helpers added; `POST /advisories/generate` **fail-closed** (`OI-01`–`OI-03`). **BLOCKED / NOT ACCEPTED** | History/accuracy routes wired; generation disabled by design pending specs | `advisory.policy.spec` (passes) + bilingual/fallback & generation tests once OI-01–03 resolved |
| 4 | **VS-04** Investment Plan Management | `FR-05`, `FR-08`–`FR-11`, `BR-01/02/09/10`, `C-01/05`, `OQ-02`, `ADR-003` | `AC-04.1`–`AC-04.7` | 5% cap, 3 equal rounded tranches, zero trades on approval, pause/resume/cancel/adjust in `plans/`, `005` schema. **NOT ACCEPTED** | Wired to React dashboard create/pause/resume/cancel forms; `OI-04` precision open | `plans.policy.spec` (passes) + negative cap (`5.01%`), atomic adjust rollback & concurrency tests |
| 5 | **VS-05** Tranche Scheduling & Human Auth | `FR-06`–`FR-11`, `BR-02/03/06/09`, `C-01/05`, `XC-01/02/05/07`, `OQ-05`, `ADR-004` | `AC-05.1`–`AC-05.11` | 5s DB-backed scheduler poll, 60s window from scheduled slot, permanent `SKIPPED`, non-backfill resume, Ed25519 challenge gate. **NOT ACCEPTED** | Backend `/scheduler/tick` & `/tranches/:id/*` implemented; React UI only triggers `/scheduler/tick` (no UI tranche sign flow yet) | `execution.policy.spec` (passes) + boundary 60s/2.0%/2.01%, pause-after-open & non-backfill integration tests |
| 6 | **VS-06** Authorized Trade Execution | `FR-06/07/10/14`, `NFR-01/02`, `BR-03/06/11`, `C-01/03`, `XC-02/03/04/05/11`, `OQ-04`, `ADR-003/004/005` | `AC-06.1`–`AC-06.9`, `AC-14.1`–`AC-14.5` | `SimulatedExchangeAdapter`, server-side expiry/price-shift/freshness recheck, append-only `simulated_trades`, zero withdrawal routes. **NOT ACCEPTED** | Simulated path wired; `credential_management` (`OI-07`) & live outage reconciliation untested end-to-end | Idempotency, double-submit, >2% shift lock, Postgres immutability trigger (`UPDATE`/`DELETE` rejection) tests |
| 7 | **VS-07** Notifications | `FR-02`, `FR-03`, `NFR-03`, `NFR-04`, `C-04`, `XC-09`, `XC-10`, `OQ-07`, `ADR-005` | `AC-07.1`–`AC-07.7` | Transactional `notification_outbox` (`006`) + `GET /notifications`; WhatsApp/Push providers & audio/NFR-04 unimplemented (`OI-09`). **NOT ACCEPTED** | In-app outbox displayed in React UI; external channel adapters absent | Transactional atomicity, failure isolation, fallback & 1,000-dispatch NFR-04 test harness |
| 8 | **VS-08** Supporting Investment Features | `FR-13`, `FR-15`, `FR-16`, `FR-17`, `BR-08`, `C-06`, `XC-03/12`, `OQ-08`, `ADR-002/003` | `AC-08.1`–`AC-08.6`, `AC-13`, `AC-15`–`AC-17` | Watchlist, journal CRUD, read-only trade history, CSV export, accuracy placeholder in `supporting/` & React UI. **NOT ACCEPTED** | Combined in `SupportingModule` (ADR-002 split pending); integrated on React dashboard | Isolation tests (zero trade mutation), owner isolation, CSV export format, accuracy sample/N/A tests |
| 9 | **VS-09** Integration & Final Validation | All `FR`/`NFR`/`BR`/`C`/`XC`/`ADR` + `QT-01`–`QT-06` (`OQ-09`) | `AC-09.1`–`AC-09.9`, `QAC-01`–`QAC-06` | Root orchestration, single-origin port 3000 serving, Vite + Nest build, lint, Jest ESM unit/e2e smoke passing. **NOT ACCEPTED** | Build/lint/unit/e2e smoke operational; Postgres E2E, Playwright/UI & QT-01–06 benchmarks pending | Full E2E suite against PostgreSQL, security audit, accessibility/p95 latency (`<500ms`), final demo evidence |

---

## 7. Current Verified Baseline Evidence (Pre-Stage 2)

- `npm run build` (frontend Vite + backend NestJS): **Passed (0 errors)**
- `npm run lint` (`backend` + `frontend` oxlint): **Passed (0 errors; 4 backend warnings, 2 frontend warnings)**
- `npm test` (Jest ESM unit tests): **7/7 suites passed, 32/32 tests passed** (`auth.service.spec.ts`, `auth.guard.spec.ts`, `app.controller.spec.ts`, `advisory.policy.spec.ts`, `market-data.policy.spec.ts`, `plans.policy.spec.ts`, `execution.policy.spec.ts`)
- `npm --prefix backend run test:e2e`: **1/1 suite passed, 1/1 test passed** (`test/app.e2e-spec.ts` on dev/test in-memory adapter)
- Fail-closed startup verified: `NODE_ENV=production` exits non-zero on missing `DB_HOST`, `USE_IN_MEMORY_DB=true`, or placeholder `JWT_SECRET`; `NODE_ENV=development` fails loudly when custom DB config cannot connect.

---

## 8. Confirmed VS-01 Scope, Acceptance Criteria, and Required Test Plan

Once the human owner approves this Stage 2 plan (and resolves the 10-vs-12-char password rule), work proceeds **ONLY to VS-01** (`VS-02`–`VS-09` remain untouched until `VS-01` is accepted).

### 8.1 Confirmed VS-01 Acceptance Criteria (`ACCEPTANCE_CRITERIA.md` & `ADR-004`)
- **AC-01.1 (Registration):** Users can register with a valid normalized email and valid password; duplicate emails return `409 Conflict` without exposing hashes.
- **AC-01.2 (Login):** Registered users can log in and receive a 1-hour Bearer JWT tied to a persisted `user_sessions` row.
- **AC-01.3 (Invalid Credentials):** Wrong password, unknown email, or malformed login payloads are rejected (`400`/`401`) with generic error messages (no user enumeration).
- **AC-01.4 (Password Hashing):** Passwords are hashed with `bcryptjs` cost factor 12; `password_hash` is never returned in API responses or logs.
- **AC-01.5 (Protected Endpoints):** Unauthenticated requests, malformed headers, expired sessions, and revoked sessions (`revoked_at IS NOT NULL`) are rejected (`401`) on `GET /auth/me`, `POST /auth/logout`, and `/auth/devices*`.
- **AC-01.6 (Session Termination):** `POST /auth/logout` revokes only the caller's active `user_sessions` row so subsequent calls with that JWT immediately fail `AuthGuard`.
- **AC-01.7 (Device-Bound Verification):** Users can obtain a 5-minute single-use challenge, register an Ed25519 SPKI public key with valid signature proof (uniquely fingerprinted per user), list active devices, revoke a device, and complete separate one-time `POST /auth/devices/:id/verify` proof-of-possession (strictly distinct from tranche execution authorization).
- **AC-01.8 (Unauthorized & Negative Security Coverage):** Automated tests verify cross-user device isolation, expired/consumed challenge replay rejection, non-Ed25519 key rejection, bad signature rejection, and revoked device rejection.

### 8.2 Required VS-01 Test Matrix (Functional, Negative, EP, BVA, Security, Integration)

| Test Category | ID | Target Rule / Boundary | Expected Result |
|---|---|---|---|
| **Functional** | VS01-FN-01 | Register -> Login -> `GET /auth/me` -> `POST /auth/logout` -> `GET /auth/me` | `201` -> `201` -> `200` -> `201` -> `401` (session revoked) |
| **Functional** | VS01-FN-02 | Device challenge -> Ed25519 sign -> `POST /auth/devices` -> `GET /auth/devices` -> auth challenge -> verify -> `DELETE /auth/devices/:id` | Device registered, verified (`verified: true`), then revoked and excluded |
| **Equivalence Partitioning (EP)** | VS01-EP-01 | Email partitions: valid mixed-case with spaces vs missing `@` vs missing domain vs empty | Mixed-case normalized & accepted; invalid formats rejected (`400`) |
| **EP** | VS01-EP-02 | Key type partitions: Ed25519 SPKI PEM vs RSA/ECDSA PEM vs malformed PEM | Only Ed25519 accepted; RSA/ECDSA/garbage rejected (`400`) |
| **Boundary-Value Analysis (BVA)** | VS01-BVA-01 | Password length around `ED-01` minimum (`11`, `12`, `13`, empty) | `11`/empty rejected (`400`); `12` and `13` accepted (`201`) |
| **BVA** | VS01-BVA-02 | `deviceName` length: empty/whitespace, `1` char, `100` chars, `101` chars | `0`/whitespace/`101` rejected (`400`); `1` and `100` accepted |
| **BVA** | VS01-BVA-03 | Signature byte length (`63`, `64`, `65` bytes) & challenge expiry (`expires_at - 1ms` vs `expires_at + 1ms`) | Valid `64`-byte before expiry passes; `63`/`65` or expired rejected (`400`/`401`) |
| **Negative / Security** | VS01-SEC-01 | Duplicate email registration (case-insensitive) & duplicate device key fingerprint | `409 Conflict` |
| **Negative / Security** | VS01-SEC-02 | Replay consumed registration or authorization challenge | `401 Unauthorized` (single-use enforced) |
| **Negative / Security** | VS01-SEC-03 | User B attempts verify/revoke on User A's `deviceId` or `challengeId` | `401`/`400` (strict owner scoping) |
| **Negative / Security** | VS01-SEC-04 | Verify against revoked device; verify `password_hash` and `JWT_SECRET` absent from responses/logs | Rejected (`401`), zero secret leakage |
| **DB / Integration** | VS01-INT-01 | Apply migrations `001` & `002` against PostgreSQL (or document container blocker & run full Nest HTTP supertest E2E suite on `AuthModule`) | All auth/device HTTP flows & constraints pass; Postgres run status honestly recorded |

---

## 9. Stage 2 Readiness Gate

- [x] Traceability matrix (`docs/planning/TRACEABILITY_MATRIX.md` & root copy) inspected and reconciled.
- [x] Dependency matrix (`docs/planning/DEPENDENCY_MATRIX.md`) validated across all 9 slices.
- [x] Vertical slices, WBS, PBS, and quality targets inspected.
- [x] All five ADRs (`ADR-001`–`ADR-005`) and non-negotiable safety constraints preserved.
- [x] Contradictions (VS-01 password minimum 10 vs 12; ADR-002/003 module consolidation; tracker snapshot vs acceptance), open issues (`OI-01`–`OI-10`), and container DB blockers documented.
- [x] Previous `plan.md` preserved in `docs/archive/previous_versions/plan-v02.md` (alongside `plan-v01.md`).
- [x] VS-01 acceptance criteria (`AC-01.1`–`AC-01.8`) and EP/BVA/negative/security test plan confirmed.
- [x] **Human owner approved Stage 2 plan v0.3, delegated `ED-01` (`12`-character minimum), and explicitly `ACCEPTED` VS-01 on 2026-11-25 (`VS-02`–`VS-09` remain untouched/unaccepted).**

**VS-01 is ACCEPTED; progression to VS-02 awaits GitHub sync/push (or explicit human instruction to proceed to VS-02).**

---

## 10. Version History

| Version | File | Summary | Status |
|---|---|---|---|
| 0.1 | `docs/archive/previous_versions/plan-v01.md` | Initial Deliverable 4 planning draft | Archived |
| 0.2 | `docs/archive/previous_versions/plan-v02.md` | Integrated baseline plan with OQ decisions and readiness checklist | Archived |
| 0.3 | `plan.md` | Stage 2 validated plan: verified runtime/test baseline, contradictions/open issues, 9-slice dependency & status reconciliation, and confirmed VS-01 test matrix | Pending human review |
