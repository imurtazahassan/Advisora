# VS-01 Acceptance Report

**Status: ACCEPTED (2026-11-25 — Explicit Human Acceptance; Dev/Test In-Memory DB Verified, Target PostgreSQL Migration Pending)**  
**Date:** 2026-11-25  
**Engineering Decision Applied:** `ED-01` (Human-Delegated Authority: registration password minimum set to **12 characters**; existing valid accounts remain compatible on login)

---

## 1. Summary of Verified Implementation

- **Registration & Password Policy (`ED-01`, `AC-01.1`, `AC-01.4`):**
  - `POST /auth/register` enforces normalized email validation (`trim().toLowerCase()`) and a **12-character** minimum password length (`MIN_REGISTRATION_PASSWORD_LENGTH = 12`) in both `backend/src/auth/auth.service.ts` and `frontend/src/App.tsx`.
  - Passwords are hashed using `bcryptjs` with cost factor `12`; `password_hash` is never returned in API responses or logs.
  - Duplicate email registration (including mixed-case/whitespace variants) fails with `409 Conflict`.
- **Login & Persistent Sessions (`AC-01.2`, `AC-01.3`, `ADR-003`):**
  - `POST /auth/login` preserves compatibility for pre-existing valid accounts regardless of legacy password length, verifies credentials in constant-ish time via `bcryptjs.compare`, creates a persistent 1-hour `user_sessions` record (`session_id`, `expires_at`), and issues a signed Bearer JWT containing `{ sub, email, sid }`.
  - Invalid credentials, unknown emails, and malformed login payloads return generic `400`/`401` errors without user enumeration.
- **Session Guard & Server-Side Logout (`AC-01.5`, `AC-01.6`):**
  - `AuthGuard` (`backend/src/auth/auth.guard.ts`) validates Bearer header formatting, JWT signature/claims (`sub`, `email`, `sid`), and active non-revoked, non-expired `user_sessions` state in the database.
  - `GET /auth/me` returns `{ id, email }` for the active caller; `POST /auth/logout` sets `revoked_at = NOW()` on only the caller's session ID (`sid`) so subsequent requests with the same JWT immediately return `401`.
- **Ed25519 Device Security & Proof-of-Possession (`AC-01.7`, `ADR-004`):**
  - `POST /auth/devices/challenge` issues a 5-minute single-use `device_registration_challenges` nonce.
  - `POST /auth/devices` enforces strict `UUID` / `base64url` / 64-byte Ed25519 signature validation, SPKI Ed25519 public-key verification (rejecting RSA/ECDSA/malformed keys), `deviceName` bounds (`1..100`), per-user SHA-256 key-fingerprint uniqueness (`409 Conflict`), and single-use challenge consumption.
  - `GET /auth/devices` lists active (`revoked_at IS NULL`) user-owned devices; `DELETE /auth/devices/:id` revokes owner-scoped devices.
  - `POST /auth/devices/:id/challenge` + `POST /auth/devices/:id/verify` perform separate one-time Ed25519 proof-of-possession checks strictly isolated from tranche execution authorization (`ADR-004`).
  - Frontend `frontend/src/App.tsx` includes a VS-01 **Device security (Ed25519)** panel using in-memory WebCrypto Ed25519 keys, explicitly labeled as web proof-of-possession rather than native OS biometrics.

---

## 2. Acceptance Criteria Evidence Matrix (`AC-01.1` – `AC-01.8`)

| Criterion | Status | Implementation Evidence | Automated & Live Verification Evidence |
|---|---|---|---|
| **AC-01.1 Registration** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.ts` (`register`, `MIN_REGISTRATION_PASSWORD_LENGTH = 12`), `frontend/src/App.tsx` (`minLength={12}`) | `auth.service.spec.ts` (11/12/13 BVA, malformed email/type, duplicate `409`); `test/vs01-auth.e2e-spec.ts` (`POST /auth/register` 11→`400`, 12→`201`, 13→`201`, dup→`409`); live `:3000` check (`11→400`, `12→201`) |
| **AC-01.2 Login** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.ts` (`login`, `issueSession`), `002_auth_sessions_devices.sql` (`user_sessions`) | `auth.service.spec.ts` (standard + legacy 10-char account login compatibility); `test/vs01-auth.e2e-spec.ts`; live `:3000` `POST /auth/login` (`201`) |
| **AC-01.3 Invalid credentials rejected** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.ts` (`login` generic `UnauthorizedException`) | `auth.service.spec.ts` & `test/vs01-auth.e2e-spec.ts` (wrong password, unknown email, malformed body → `400`/`401` with identical generic message) |
| **AC-01.4 Passwords securely hashed** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.ts` (`bcryptjs.hash(..., 12)`), `UsersService` projection | `test/vs01-auth.e2e-spec.ts` explicitly verifies stored DB row uses `$2a$12$`/`$2b$12$` bcrypt cost 12 and API payloads omit `password_hash` and `password` |
| **AC-01.5 Protected endpoints** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.guard.ts` (`AuthGuard`), `backend/src/auth/auth.controller.ts` | `auth.guard.spec.ts` (missing header, Basic auth, invalid JWT, missing claims, revoked/expired DB session); `test/vs01-auth.e2e-spec.ts`; live `:3000` `GET /auth/me` (`200` active → `401` revoked) |
| **AC-01.6 Session termination** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.ts` (`logout` revoking caller `sid`), `frontend/src/App.tsx` | `auth.service.spec.ts` (single-session revocation); `test/vs01-auth.e2e-spec.ts` (revokes Session 1 while keeping Session 2 active); live `:3000` `POST /auth/logout` (`201`) → `GET /auth/me` (`401`) |
| **AC-01.7 Device-bound verification** | VERIFIED FOR WEB PROOF-OF-POSSESSION (`ADR-004` Boundary Preserved) | `backend/src/auth/auth.service.ts` (`createDeviceChallenge`, `registerDevice`, `listDevices`, `revokeDevice`, `createDeviceAuthorizationChallenge`, `verifyDeviceAuthorization`), `frontend/src/App.tsx` | `auth.service.spec.ts` & `test/vs01-auth.e2e-spec.ts` (Ed25519 challenge/sign/register/list/verify/revoke, `deviceName` 1/100/101 BVA, 0 plans & 0 trades created) |
| **AC-01.8 Unauthorized access tests** | VERIFIED (Dev/Test In-Memory Adapter) | `backend/src/auth/auth.service.spec.ts`, `backend/src/auth/auth.guard.spec.ts`, `backend/test/vs01-auth.e2e-spec.ts` | Cross-user isolation (`User B` on `User A` device/challenge → `401`/`400`), challenge replay (`401`), expiry (`401`), RSA/ECDSA rejection (`400`), 63-byte signature rejection (`400`), malformed UUID (`400`), revoked device verify (`401`) |

---

## 3. Automated & Live Verification Summary

- `npm run build` (`compile_applet`): **Passed (0 errors)**
- `npm run lint` (`lint_applet`): **Passed (0 errors; 8 warnings in backend, 2 warnings in frontend)**
- `npm test` (Jest ESM unit suite): **7/7 suites passed, 42/42 tests passed**
- `npm --prefix backend run test:e2e -- --runInBand`: **2/2 suites passed, 5/5 tests passed** (`test/vs01-auth.e2e-spec.ts` + `test/app.e2e-spec.ts`)
- Live single-origin server on `http://127.0.0.1:3000`: **Verified** (`GET / -> 200`, `POST /auth/register` 11 chars -> `400`, 12 chars -> `201`, `POST /auth/login -> 201`, `GET /auth/me -> 200`, `POST /auth/logout -> 201`, post-logout `GET /auth/me -> 401`)

---

## 4. Known Limitations & Unresolved Requirements (Not Silently Masked)

1. **PostgreSQL Environment Blocker (`OI-10`):** No PostgreSQL server daemon or `psql` client is installed in the AI Studio workspace container. All integration, E2E, and live `:3000` checks ran against the strictly development/test-only `in-memory-pg.ts` adapter (`ADR-003` PostgreSQL remains the authoritative production DB). Migrations `001_create_users.sql` and `002_auth_sessions_devices.sql` still require execution against a live PostgreSQL instance in the target local/CI environment.
2. **Native OS Biometrics & Two-Factor OTP PIN Recovery (`OI-05` / `OQ-06` / `E-45`):** The web application provides in-memory WebCrypto Ed25519 proof-of-possession only. Native Face ID / Touch ID hardware enclave prompts and 2FA OTP PIN recovery remain deferred outside the web slice.
3. **Device Key Rollover & Lost-Device Recovery (`OI-06` / `ADR-004`):** Current scope supports device registration, verification, listing, and revocation; automated key rollover and lost-device recovery policies remain open in `ADR-004`.
4. **Tranche Grant Separation (`ADR-004`):** `POST /auth/devices/:id/verify` proves device key possession only; tranche authorization grants and simulated/live execution remain strictly isolated in `VS-05`/`VS-06` and are untouched here.

---

## 5. Human Acceptance Decision

- [x] `ED-01` recorded in `docs/planning/DECISION_REGISTER.md` and traceability matrices.
- [x] Backend (`12` chars) and frontend (`12` chars) validation aligned with 11/12/13 BVA tests and legacy account login compatibility.
- [x] Full unit (`42/42`), HTTP E2E (`5/5`), build, lint, and port `3000` checks executed and documented.
- [x] **Explicit human `ACCEPT` recorded on 2026-11-25** (`VS-01` accepted on the verified dev/test in-memory DB baseline; target PostgreSQL `001`/`002` migration verification and deferred native biometrics/OTP/key-rollover items remain documented under Section 4).
