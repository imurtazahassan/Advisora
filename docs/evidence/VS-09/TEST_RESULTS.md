# VS-09 Integration Validation Results

## Re-run on 2026-11-26 (Windows, Node v24.15.0, npm 11.12.1)

| Configured command | Outcome |
|---|---|
| `npm --prefix backend test -- --runInBand` | PASS — 7 suites, 42 tests |
| `npm --prefix backend run test:e2e -- --runInBand` | PASS — 2 suites, 5 tests |
| `npm --prefix backend run build` | PASS — NestJS production build |
| `npm --prefix backend run lint` | PASS exit code; 7 warnings (Jest `unbound-method`) |
| `npm --prefix frontend run build` | PASS — TypeScript and Vite production build |
| `npm --prefix frontend run lint` | PASS exit code; 2 React hook warnings in `src/App.tsx` |
| Frontend tests | NOT CONFIGURED — `frontend/package.json` defines no test script or test framework |
| `npm --prefix backend run db:migrate` against isolated PostgreSQL | NOT RUN — PostgreSQL service is running; `psql` is installed outside PATH. No valid database credentials were available; sample credentials return `28P01`. No database was modified |

These checks establish unit, smoke-E2E, and build/lint status only. They do not verify PostgreSQL migrations or full acceptance of VS-02 through VS-09. Unit coverage includes auth, app controller, market-data policy, advisory policy, plan policy, and execution policy. The initial two E2E suites covered the app smoke route and VS-01 auth flows. Supporting-feature behavior has no dedicated automated suite in the current test set.

The backend lockfile was repaired after `npm ci` detected that `bcryptjs` and `@types/bcryptjs`, required by `backend/package.json`, were absent from the lockfile. A clean backend install then completed successfully.

## Final regression after dashboard and workflow updates (2026-11-26)

| Root command | Outcome |
|---|---|
| `npm test` | PASS — 7 backend unit suites, 42 tests |
| `npm run test:e2e` | PASS — 3 backend E2E suites, 8 tests (includes plan allocation/ownership, no-trade-on-plan, outbox event, and scheduled-window rejection checks) |
| `npm run test:frontend` | PASS — 1 Vitest file, 3 tests |
| `npm run build` | PASS — frontend TypeScript/Vite production build and backend NestJS production build |
| `npm run lint` | PASS — backend 7 warnings (`unbound-method` in auth tests); frontend 0 warnings |

A manual local UI smoke check also passed registration, sign-in, dashboard loading, navigation, and the simulated/PENDING_POLICY display against the development-only in-memory adapter. The test account and application state were volatile and were discarded when the local process stopped. This was not a PostgreSQL test or slice acceptance.

**Coverage limits:** VS-02 has market policy unit coverage; VS-03 has policy helper coverage and remains fail-closed; VS-04 has allocation/ownership/plan-creation E2E coverage; VS-05 has a negative pre-window authorization E2E check; VS-06 has execution-policy unit coverage and plan creation is verified to produce no trade, but the valid-signal execution happy path is not E2E-tested; VS-07 has a plan-created outbox assertion, not external provider delivery; VS-08 watchlist and journal CRUD plus CSV export have in-memory E2E coverage; PostgreSQL persistence remains unverified. Frontend component tests cover auth/password feedback and dashboard initial render. These checks do not accept VS-02 through VS-09.

## Historical evidence (2026-11-25)

| Check | Result |
|---|---|
| TypeScript/TSX syntax transpilation | PASS — 41 files parsed with TypeScript transpileModule; syntax/transpile diagnostics absent |
| Migration runner JavaScript syntax | PASS — `node --check` |
| Allocation and tranche policy helper checks | PASS — 4/4 |
| Authorization safety policy helper checks | PASS — 7/7 |
| Migration source invariants | PASS — ordered files, signal FK and append-only trigger present |
| Full TypeScript semantic build | NOT RUN — required @types packages unavailable |
| Jest suite | NOT RUN — npm ci did not complete |
| Frontend Vite production build | NOT RUN — npm ci did not complete |
| PostgreSQL migration execution | NOT RUN — no PostgreSQL server/client available |
| End-to-end workflow | NOT RUN |

The 11 local policy checks were executed against TypeScript transpile output in a Node VM. They are not a substitute for the project's Jest suite or database integration tests.

Final source pass after exchange-port integration: 43 TypeScript/TSX files transpiled with no syntax/transpile diagnostics. Eleven policy assertions passed in a Node VM harness (not Jest). `node --check backend/scripts/migrate.cjs` passed.
