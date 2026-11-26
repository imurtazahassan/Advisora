# ADVISORA backend

NestJS API for the human-controlled digital-asset advisory demo. PostgreSQL is the persistence target; the simulated in-memory adapter is development/test-only and volatile.

## Run

Install with `npm ci`. For the integrated app, configure the repository-root `.env.example` as `.env`, run migrations from the repository root with `npm run db:migrate`, then run `npm run dev`.

To run NestJS standalone from `backend/`, configure `backend/.env`, apply migrations from that directory with `npm run db:migrate`, then use `npm run start:dev`.

## Checks

```sh
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run lint
```

The E2E suite runs against the development/test adapter unless configured otherwise. It does not verify PostgreSQL migrations. For routes and request shapes, see [`../docs/API_REFERENCE.md`](../docs/API_REFERENCE.md).
