# ADVISORA — Initial Repository Audit

Audit input: `ADVISORA_FULL_PROJECT_AUDIT.zip`
Audit date: 2026-11-25

## Executive finding

The archive contains the approved Deliverable 3 baseline, Deliverable 4 planning documents, a small NestJS authentication foundation, and a minimal React login/register screen. It does **not** contain a completed vertical slice. The implementation tracker correctly records all nine slices as NOT STARTED.

## Existing implementation

### Backend
- NestJS application bootstrap and global configuration.
- PostgreSQL connection pool provider.
- `users` table migration.
- Registration endpoint with email validation and bcrypt password hashing.
- Login endpoint with bcrypt verification and JWT issuance.
- Basic controller/service test scaffold.

### Frontend
- React/Vite application.
- Login and registration forms calling `http://localhost:3000/auth/...`.
- A local token state that switches to a dashboard placeholder.
- Dashboard figures are hard-coded demo values, not database-backed data.

## VS-01 gap assessment

Acceptance criteria in `docs/planning/ACCEPTANCE_CRITERIA.md` require: registration, login, invalid-credential rejection, password hashing, protected endpoint enforcement, session termination, server verification of device-bound authorization, and unauthorized-access tests.

Current evidence supports only partial foundations for registration, login, invalid-credential rejection, and password hashing. The following are missing or not demonstrated in the supplied code:

1. Authentication guard and a protected endpoint proving JWT enforcement.
2. Server-side session revocation/termination; current frontend logout only clears React state.
3. Device registration and public-key storage.
4. Server-side verification of device-signed authorization challenges.
5. Tests for protected access, invalid/expired tokens, session termination, and device signature verification.
6. Evidence reports and screenshots for VS-01.

ADR-004 selects device-signed ephemeral grant tokens and says device registration/key rollover/lost-device recovery details remain implementation details. The browser UI currently does not implement the selected secure-device flow. We must not replace it with a client-supplied `{authorized:true}` flag or claim biometric security without a real platform-backed authenticator.

## Important approved constraints to preserve

- TypeScript, NestJS, React, PostgreSQL; initial exchange integration is simulated.
- Modular Monolith with Ports & Adapters.
- No Redis; scheduling must be relational-database-backed.
- Every tranche needs fresh, explicit authorization; 60-second server-side expiry.
- Scheduler must never authorize or execute trades independently.
- Market data older than 15 seconds or ticker latency greater than 5 seconds locks Buy.
- Price increase strictly greater than 2.0% invalidates; exactly 2.0% does not.
- Plan allocation maximum 5%; three equal tranches; plan setup executes zero trades.
- Missed/expired tranches are permanently skipped; resume only future eligible tranches, no backfill.
- No withdrawals or external transfers; exchange keys with unverifiable withdrawal permissions stay inactive.
- Execution ledger is append-only.
- Signal accuracy is rolling 30-day, outcome-based and measurement-only; unresolved details must remain explicit.

## Archive integrity note

The uploaded ZIP used Windows backslash separators in entry names. This audit package normalizes those paths into ordinary folders so the repository can be browsed and edited reliably on other systems. Source file contents are preserved.

## Verification limitations

The supplied archive excludes `node_modules` and `.env` files. Therefore no claim is made here that TypeScript builds, unit tests, database migrations, or end-to-end tests pass. Those must be run in the local project environment after dependencies and local configuration are available.

## Recommended implementation sequence

1. Complete VS-01 against ADR-004, including protected-route enforcement, server-side session termination, device registration and signed-challenge verification, with security tests. Do not claim biometric/secure-enclave assurance unless implemented using a platform authenticator.
2. Record actual test results and acceptance evidence before marking VS-01 accepted.
3. Proceed to VS-02 only after the dependency and acceptance gates are met.
