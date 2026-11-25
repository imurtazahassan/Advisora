# VS-01 Acceptance Report

**Status: IN PROGRESS — NOT ACCEPTED**

## Implemented in this work session
- Persistent one-hour user sessions recorded in PostgreSQL.
- JWTs include a session identifier; protected routes validate the session remains active in the database.
- Authenticated identity endpoint (`GET /auth/me`).
- Server-side session revocation (`POST /auth/logout`).
- Device registration challenge with five-minute server-side expiry.
- Ed25519 public-key proof-of-possession during device registration.
- Authenticated device listing and revocation endpoints.
- Frontend logout calls the server and demo-only fabricated portfolio figures were removed.
- Registration password minimum raised to 12 characters.

## Acceptance criteria status
| Criterion | Status | Notes |
|---|---|---|
| AC-01.1 Registration | IMPLEMENTED, UNVERIFIED | Existing registration retained; DB-backed execution not run here. |
| AC-01.2 Login | IMPLEMENTED, UNVERIFIED | Creates a persistent session and JWT. |
| AC-01.3 Invalid credentials rejected | IMPLEMENTED, UNVERIFIED | Generic unauthorized response. |
| AC-01.4 Passwords securely hashed | IMPLEMENTED, UNVERIFIED | Existing bcrypt cost 12 retained. |
| AC-01.5 Protected endpoints | IMPLEMENTED, UNVERIFIED | Session-aware guard added. |
| AC-01.6 Session termination | IMPLEMENTED, UNVERIFIED | Server revocation endpoint added. |
| AC-01.7 Device-bound verification | PARTIAL | Device proof-of-possession registration added; tranche grant verification belongs to VS-05/VS-06 and is not implemented. |
| AC-01.8 Unauthorized access tests | NOT RUN | Requires dependency installation and test execution. |

## Required verification before acceptance
1. Apply migration `002_auth_sessions_devices.sql` after `001_create_users.sql`.
2. Install backend dependencies and run `npm run build`, `npm test`, and e2e tests.
3. Add/run integration tests against PostgreSQL for login, protected access, logout revocation, challenge expiry/replay, invalid signatures, device isolation and device revocation.
4. Verify deployment configuration uses a strong private `JWT_SECRET` and does not log credentials or tokens.

## Limitations and open details
- Device key rollover and lost-device recovery remain unresolved in the approved ADR-004. This implementation does not silently define those policies.
- This is a web demo foundation; native OS biometric prompts and hardware-backed secure-enclave storage require a mobile/native client and are not claimed here.
- Device registration is not itself a tranche authorization and cannot authorize or execute trades.
- No live exchange integration or real trade execution is present.

## Test results
Not run in this environment: the uploaded project contains no `node_modules`, and no PostgreSQL instance or project secrets were supplied.
