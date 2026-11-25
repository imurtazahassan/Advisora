# VS-01 Test Results

**Status: NOT RUN — environment dependency installation timed out.**

No automated test is reported as passed in this evidence file.

| Check | Result | Notes |
|---|---|---|
| Dependency installation | BLOCKED | `npm ci` timed out in the packaging environment; installed dependencies are incomplete. |
| NestJS TypeScript build | NOT RUN | Requires successful dependency installation. |
| Existing AuthGuard Jest tests | NOT RUN | Requires successful dependency installation. |
| New AuthService device proof Jest tests | NOT RUN | Requires successful dependency installation. |
| PostgreSQL migration 002 | NOT VERIFIED | Must be applied to the target local database. |
| AC-01.8 unauthorized access tests | NOT VERIFIED | Requires full test execution and integration coverage. |

## Required next verification

1. Install backend dependencies with `npm ci`.
2. Apply migrations 001 and 002 in numeric order.
3. Run `npm run build`.
4. Run `npm test -- --runInBand`.
5. Record actual output and resolve all failures before acceptance.
