# VS-01 Implementation Notes

**Date:** 2026-11-25  
**Status:** Implemented and verified against dev/test in-memory PostgreSQL adapter; awaiting human acceptance (`VS-02`–`VS-09` untouched)  
**Engineering Decision:** `ED-01` (12-character registration password minimum; login backward-compatible with pre-existing valid accounts)

---

## Implemented in VS-01

- **Password Policy & Registration (`ED-01`, `backend/src/auth/auth.service.ts`, `frontend/src/App.tsx`):**
  - Enforced `MIN_REGISTRATION_PASSWORD_LENGTH = 12` on `POST /auth/register`, along with strict `typeof` string validation and trimmed lowercase email normalization (`^[^\s@]+@[^\s@]+\.[^\s@]+$`).
  - Frontend registration form sets `minLength={12}` only when `page === 'register'` and displays `"Minimum 12 characters required for registration."` without blocking legacy accounts on `login`.
  - Passwords are hashed with `bcryptjs` (cost factor `12`); `password_hash` is stripped from all responses.
- **Persistent Sessions & AuthGuard (`backend/src/auth/auth.guard.ts`, `backend/src/auth/auth.service.ts`):**
  - `POST /auth/login` verifies password hashes via `bcryptjs.compare` (supporting existing valid accounts under `<12` chars) and inserts a 1-hour `user_sessions` record bound to `sid`.
  - `AuthGuard` validates Bearer header syntax, JWT signature, required claims (`sub`, `email`, `sid`), and non-revoked/non-expired `user_sessions` state.
  - `POST /auth/logout` revokes only the caller's session row (`revoked_at = NOW()`).
- **Ed25519 Device Registration, Proof-of-Possession & Revocation (`backend/src/auth/auth.service.ts`, `frontend/src/App.tsx`):**
  - Enforced strict UUID format validation on `challengeId` and `deviceId`, `1..100` trimmed length bounds on `deviceName`, strict base64url + exact 64-byte decoded signature checks, SPKI Ed25519 key parsing (rejecting RSA/ECDSA/invalid keys), per-user key-fingerprint `409 Conflict` checks, and atomic conditional consumption of 5-minute single-use challenges.
  - Added VS-01 **Device security (Ed25519)** panel in `frontend/src/App.tsx` using WebCrypto (`Ed25519`, non-extractable in-memory private key handle) for challenge signing, `GET /auth/devices`, `POST /auth/devices/:id/verify`, and `DELETE /auth/devices/:id`.

---

## Deliberate Boundaries (`ADR-004`)

- Device proof-of-possession verifies registered key custody only; it is **not** a tranche authorization grant and cannot initiate or execute trades.
- No native Face ID / Touch ID or hardware secure-enclave claims are made in the web build; the UI explicitly labels WebCrypto proof-of-possession as web-based.
- Two-factor OTP PIN recovery, device key rollover, and lost-device recovery remain outside this slice (`OI-05`, `OI-06`).
- Zero withdrawal endpoints or live exchange credentials exist.

---

## Verification Summary & Database Note

- Unit tests (`7/7` suites, `42/42` tests), HTTP E2E tests (`2/2` suites, `5/5` tests), `npm run build`, `npm run lint`, and live port `3000` HTTP checks all passed.
- Because no PostgreSQL server binary is present in the AI Studio container, verification ran against the guarded dev/test fallback (`backend/src/database/in-memory-pg.ts`). Running migrations `001_create_users.sql` and `002_auth_sessions_devices.sql` against a real PostgreSQL instance remains required before production deployment (`ADR-003`).
