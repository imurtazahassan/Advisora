# ADVISORA

**Human-controlled digital-asset advisory demo**

ADVISORA helps a user review market context and manage a simulated investment plan. It is an advisory application, not an autonomous trading bot. Every simulated tranche requires explicit, one-time authorization. No live exchange, withdrawal, or transfer integration is present.

> **Simulation only.** The current market provider and execution adapter are simulated. Advisory signal generation remains fail-closed until approved target-yield, volatility, and asset-eligibility rules are supplied.

## Capabilities

- Account registration, sign-in, sessions, device registration, and Ed25519 proof of possession.
- Simulated market snapshots with freshness, latency, and eligibility state.
- Fail-closed advisory signal endpoint and rolling accuracy summary.
- Investment plans with allocation checks, three-tranche schedules, pause/resume/cancel, and replacement.
- Short-lived, server-checked tranche authorization and simulated execution.
- In-app notification outbox, watchlist, private decision journal, and simulated trade history/CSV export.
- Responsive dashboard that displays only values provided by the API.

## Quick start

Requirements: Node.js 22 or newer and npm. PostgreSQL 14+ is the persistence target.

1. Install backend and frontend dependencies from their lockfiles:

   ```sh
   cd backend && npm ci
   cd ../frontend && npm ci
   ```

2. Copy [`.env.example`](.env.example) to the repository root as `.env` (`cp .env.example .env` in a POSIX shell, or `Copy-Item .env.example .env` in PowerShell). Set PostgreSQL connection values and a long random `JWT_SECRET`. Never commit `.env`.
3. Apply migrations and start the integrated local app:

   ```sh
   npm run db:migrate
   npm run dev
   ```

   The single-origin app is served at `http://localhost:3000`. In development/test only, the server can use a non-persistent in-memory adapter when no database host is configured. All data is lost when the process stops; this is not PostgreSQL verification or production persistence.

To run Vite separately, start the backend on port `3000`, then use `npm --prefix frontend run dev` and open `http://127.0.0.1:5173`. Vite proxies app API routes to the local backend; the dev server binds to loopback only.

## Verification commands

Run from the repository root:

```sh
npm test                 # Backend unit tests
npm run test:e2e         # Backend E2E tests
npm run test:frontend    # Frontend Vitest tests
npm run build            # Frontend and backend production builds
npm run lint             # Backend and frontend lint
```

Current frontend tests cover the auth shell, password-length feedback, and dashboard loading after sign-in. Backend unit and E2E suites cover auth, selected module policies, and smoke routes; they do not constitute full E2E coverage of every slice or PostgreSQL migration verification. See [latest test evidence](docs/evidence/VS-09/TEST_RESULTS.md).

## Architecture and project navigation

- [Course baseline, PRD, architecture, ADRs, and architecture evidence](docs/baseline/deliverable-3/README.md)
- [Architecture baseline](docs/architecture/ARCHITECTURE_BASELINE.md)
- [API reference](docs/API_REFERENCE.md)
- [Vertical-slice plan and acceptance criteria](docs/planning/VERTICAL_SLICES.md)
- [Implementation tracker](docs/planning/IMPLEMENTATION_TRACKER.md)
- [Requirements traceability](docs/planning/TRACEABILITY_MATRIX.md)
- [Documentation and evidence index](docs/README.md)
- [Assignment 4 evidence and gaps](docs/submission/README.md)

Each slice's notes and available tests are under `docs/evidence/VS-01/` through `docs/evidence/VS-09/`.

## Safety and limitations

- Market data and exchange execution are simulated, not live.
- The in-app notification outbox is implemented; external email, WhatsApp, and push delivery are not connected.
- Ed25519 browser proof of possession is implemented. Native OS biometrics, secure enclave key custody, and recovery flows are not.
- Signal creation intentionally remains disabled while required policy decisions are unresolved. Eligibility is `PENDING_POLICY` where applicable.
- Execution is blocked without a linked, valid signal, an open authorization window, a fresh market tick, and a valid device signature.
- PostgreSQL is authoritative. In-memory mode is development/test-only and volatile.
- The original Assignment 4 rubric/instructions and genuine UI screenshots were not present in the inspected project folder; see the submission index.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local quality checks and safety boundaries.
