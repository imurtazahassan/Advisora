# VS-01 Implementation Notes

**Date:** 2026-11-25  
**Status:** Implementation expanded; verification pending

## Implemented in this package

- Persistent one-hour server-side sessions stored in PostgreSQL.
- Bearer authentication guard checks JWT claims against a non-revoked, non-expired database session.
- Protected identity (`GET /auth/me`) and logout (`POST /auth/logout`) endpoints.
- Device registration uses a five-minute, one-time server challenge and Ed25519 proof of private-key possession.
- Active device listing and owner-scoped device revocation.
- Device proof-of-possession verification uses a separate one-time challenge bound to the user and registered device; verification checks the stored public key and rejects expired, consumed, revoked, or non-owned device challenges.
- Challenge consumption is conditional and rechecks device revocation at consume time to reduce replay/race exposure.
- Added unit tests for device challenge creation, valid signature verification, invalid signatures, unavailable challenges, and missing proof fields.

## Deliberate boundaries

- Device proof-of-possession is not a tranche authorization grant.
- No native Face ID / Touch ID integration is claimed.
- PIN recovery with two-factor OTP is not implemented in this slice yet.
- No exchange API credentials are collected or exposed.

## Verification status

- `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --fetch-retries=0` was attempted in the packaging environment but timed out before dependencies were installed.
- Consequently, TypeScript build and Jest tests have **not** been executed here.
- Do not mark VS-01 ACCEPTED until the migration is applied locally and the backend build/tests pass, including the new service tests and existing authentication guard tests.

## Local verification commands

From `backend/` after dependencies are installed and PostgreSQL migrations 001 and 002 have been applied:

```bash
npm run build
npm test -- --runInBand
```

## Acceptance mapping

- AC-01.1 through AC-01.4: existing registration/login/password hashing implementation; requires regression test execution.
- AC-01.5 and AC-01.6: protected session guard and server-side session revocation; existing guard tests cover active/revoked sessions.
- AC-01.7: device registration plus server-side Ed25519 device proof-of-possession verification endpoint.
- AC-01.8: not yet verified; full automated test run is pending.
