# VS-01 Test Results

**Status: AUTOMATED UNIT, E2E, BUILD, LINT & PORT 3000 CHECKS PASSED (DEV/TEST IN-MEMORY DB); LIVE POSTGRESQL VERIFICATION PENDING**  
**Date:** 2026-11-25

---

## 1. Command Execution Matrix

| Check | Command | Result | Scope / Notes |
|---|---|---|---|
| **Build (Frontend + Backend)** | `npm run build` (`compile_applet`) | **PASS (0 errors)** | Compiled Vite React bundle (`frontend/dist`) and NestJS TypeScript (`backend/dist`). |
| **Lint (Frontend + Backend)** | `npm run lint` (`lint_applet`) | **PASS (0 errors)** | `oxlint` across `backend` (8 pre-existing/non-fatal warnings) and `frontend` (2 warnings). |
| **Unit Tests (Jest ESM)** | `npm test` | **PASS (7/7 suites, 42/42 tests)** | Includes expanded `auth.service.spec.ts` (11/12/13-char BVA, legacy login compatibility, malformed payloads, device Ed25519/RSA/409/UUID) and `auth.guard.spec.ts` (missing/Basic/invalid/missing-claims/revoked/expired). |
| **Backend HTTP E2E Tests** | `npm --prefix backend run test:e2e -- --runInBand` | **PASS (2/2 suites, 5/5 tests)** | `test/vs01-auth.e2e-spec.ts` (`AC-01.1`–`AC-01.8` over Nest `AppModule` + `supertest`) and `test/app.e2e-spec.ts`. Executed against `createInMemoryPgPool()` in `NODE_ENV=test`. |
| **Live Port `3000` Smoke** | `node` HTTP check vs `http://127.0.0.1:3000` | **PASS** | `GET /` → `200`; `POST /auth/register` (11 chars) → `400`; `POST /auth/register` (12 chars) → `201`; `POST /auth/login` → `201`; `GET /auth/me` → `200`; `POST /auth/logout` → `201`; post-logout `GET /auth/me` → `401`. |
| **PostgreSQL Migrations `001` & `002`** | N/A (`psql` / Postgres daemon absent in container) | **NOT RUN (Environment Blocker)** | Schema migrations `001_create_users.sql` and `002_auth_sessions_devices.sql` require verification against a live PostgreSQL server outside this container. |

---

## 2. Detailed VS-01 Test Coverage Breakdown

### Unit Suites (`auth.service.spec.ts` & `auth.guard.spec.ts`)
- **Password BVA (`ED-01`):** Rejects `11`-character password (`400 Bad Request`); accepts `12` and `13` characters; rejects non-string/empty email or password payloads.
- **Legacy Login Compatibility:** Verifies an existing seeded account with a valid 10-character bcrypt hash continues to authenticate via `POST /auth/login`.
- **Session Lifecycle & AuthGuard:** Verifies `logout` revokes active `sid`, rejects missing/non-Bearer (`Basic`) headers, rejects invalid JWT signatures, rejects tokens missing `sid`/`sub`/`email`, and rejects revoked/expired DB sessions.
- **Device Ed25519 Security:** Verifies challenge creation, valid Ed25519 proof registration, non-Ed25519 (RSA) key rejection, duplicate key fingerprint (`409`), malformed UUID rejection (`400`), missing/invalid signatures (`400`/`401`), consumed/revoked challenge rejection, and owner-scoped verification.

### HTTP E2E Suite (`backend/test/vs01-auth.e2e-spec.ts`)
1. **Registration, Password BVA (`11`/`12`/`13`), Hashing (`bcryptjs` cost 12) & Duplicate Check (`AC-01.1`, `AC-01.4`):**
   - Mixed-case/spaced email normalized; `11`-char password returns `400`; `12` and `13` return `201` without `password_hash` or plaintext password; stored DB hash matches `^\$2[aby]\$12\$`; duplicate normalized email returns `409 Conflict`.
2. **Login Compatibility, Generic Invalid Credentials, Multi-Session & Single-Session Logout (`AC-01.2`, `AC-01.3`, `AC-01.5`, `AC-01.6`):**
   - Legacy 10-char account succeeds on `/auth/login`; unknown email, wrong password, and malformed body return generic `400`/`401`; Session 1 logout revokes Session 1 (`GET /auth/me` → `401`) while Session 2 remains `200 OK`; malformed `Basic` auth returns `401`.
3. **Full Ed25519 Device Lifecycle, Boundaries & Cross-User Security (`AC-01.7`, `AC-01.8`, `ADR-004`):**
   - `deviceName` BVA (`101` chars → `400`, `100` chars → `201`); non-Ed25519 RSA key → `400`; 63-byte signature → `400`; malformed UUID → `400`; duplicate device key fingerprint → `409`; registration challenge replay → `401`; User B isolation on User A device/challenge → `401`/`400`; separate verification challenge (`POST /auth/devices/:id/verify`) succeeds once (`{ verified: true }`) and blocks replay; revocation removes device from `GET /auth/devices` and blocks further verification (`401`); confirms zero investment plans (`0`) and zero trades (`0`) were created.
