# ADVISORA — Integrated Coursework Demo

Human-Controlled Digital-Asset Advisory Application. This is a simulated-only coursework implementation. It is not connected to a live exchange and must not be used to make investment decisions.

## Project contents
- `backend/` — NestJS API, PostgreSQL migrations, simulated scheduler/execution, supporting modules.
- `frontend/` — React/Vite dashboard.
- `docs/baseline/deliverable-3/` — original approved PRD, architecture and ADRs.
- `docs/planning/` — original project plan, PBS/WBS, dependency matrix, traceability and tracker.
- `docs/evidence/` — slice implementation notes and test evidence status.
- `scripts/` — root project scripts.

## Requirements
- Node.js 22.22.3 or newer in the Node 22 line (the locked NestJS toolchain declares this minimum).
- npm compatible with the lockfiles.
- PostgreSQL 14+ recommended.

## Backend setup
1. Create a PostgreSQL database named `advisora`.
2. Copy `backend/.env.example` to `backend/.env` and fill in local database values plus a long random `JWT_SECRET`. Never commit `.env`.
3. In `backend/`, run `npm ci`.
4. Run `npm run db:migrate` to apply ordered SQL migrations.
5. Run `npm run start:dev`.

Backend defaults to `http://localhost:3000`.

## Frontend setup
1. In `frontend/`, run `npm ci`.
2. Optionally create `frontend/.env` with `VITE_API_URL=http://localhost:3000`.
3. Run `npm run dev` and open the Vite URL printed in the terminal.

## Tests and builds
- Backend: `npm test -- --runInBand` and `npm run build`.
- Frontend: `npm run build`.
- Database integration and end-to-end checks must be run with a local PostgreSQL instance.

## Demo flow
1. Register a user and sign in.
2. Inspect the simulated BTC/USDT and ETH/USDT market feed.
3. Add assets to the personal watchlist.
4. Create a simulated three-tranche plan using a demo balance and allocation no greater than 5%.
5. Pause/resume/cancel the plan; run scheduler checks to inspect authorization-window behavior.
6. Use journal, notification history and CSV export.

Advisory generation remains intentionally fail-closed until unresolved approved target-yield, volatility and eligibility specifications are formally decided. Consequently, simulated trade execution rejects plans without an active linked signal. Device signatures are not a substitute for native OS biometric integration.

See `docs/API_REFERENCE.md` for the authenticated route list.

## Important safety and implementation status
See `docs/IMPLEMENTATION_STATUS_AND_LIMITATIONS.md` and `docs/evidence/VS-09/TEST_RESULTS.md`. Backend and frontend builds, backend unit/E2E suites, and lint were run on 2026-11-26; PostgreSQL migration verification remains blocked by local database authentication. VS-01 has a previously recorded human acceptance; VS-02 through VS-09 remain unaccepted. Exchange integration is simulated only; there are no withdrawal or transfer endpoints.


## Latest scheduler hardening

The current implementation snapshot includes a scheduler safety update: tranche authorization expiry is anchored to the persisted scheduled time; missed/expired slots are permanently skipped; scheduler transitions and their in-app notification outbox records are written atomically; and resuming a paused plan skips elapsed slots and schedules only future eligible tranches at 24-hour intervals. These changes still require PostgreSQL integration and full automated test verification before acceptance.
