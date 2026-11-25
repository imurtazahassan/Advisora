# VS-03 — Advisory Signal Generation: Implementation Notes

**Status: PARTIAL FOUNDATION — SIGNAL GENERATION BLOCKED; NOT ACCEPTED.**

## Added

- Authenticated `POST /advisories/generate` endpoint.
- Authenticated `GET /advisories` history endpoint, scoped to the authenticated user.
- Authenticated `GET /advisories/accuracy` rolling 30-day result with sample size, N/A handling, available-history disclosure and non-guarantee disclaimer.
- `advisory_signals` PostgreSQL migration with user ownership, positive price/yield constraints, exact 60-second expiry constraint, bilingual text fields, invalidation fields and outcome tracking.
- Pure policy helpers for exact one-minute expiry, strict upward price-shift `> 2%`, and strict loss-limit `> 3%` boundaries.
- Tests for the boundaries and fail-closed policy gate.

## Safety behavior

The generation endpoint intentionally fails closed. It does not create a Buy signal while any prerequisite is unresolved. In the supplied baseline and current VS-02 implementation:

1. Market-data asset eligibility is `PENDING_POLICY` because the objective conservative liquidity/volatility eligibility thresholds and ranking source are not approved.
2. The PRD requires a target profit yield but does not state a numeric target yield or approved calculation method.
3. The PRD states a greater-than-5% move within one hour suppresses signals, but says the exact reference price, rolling-window calculation and reset logic require an implementation decision.

No target yield, volatility algorithm, or asset eligibility threshold has been invented in code.

## API

- `POST /advisories/generate` with `{ "symbol": "BTC/USDT" }`: returns a policy-not-ready conflict and reasons until all approved prerequisites are configured.
- `GET /advisories`: returns the authenticated user's signal history (up to 100 entries).
- `GET /advisories/accuracy`: returns rolling 30-day accuracy, evaluated sample size, `N/A` when no evaluated records exist, and the required historical-performance disclaimer.

## Database

Apply `backend/src/database/migrations/004_advisory_signals.sql` after migrations 001–003. The repository currently has no automatic migration runner; apply SQL using the project's established local PostgreSQL procedure.

## Verification

- TypeScript build: NOT RUN (dependencies are not installed in this workspace).
- Jest: NOT RUN (dependencies are not installed in this workspace).
- PostgreSQL migration: NOT RUN (no database connection supplied).
- API integration: NOT RUN.

## Acceptance

VS-03 is not accepted. AC-03.1 cannot pass until approved signal business rules and target yield exist. AC-03.5 is guarded fail-closed. History and accuracy endpoints are implemented but require database integration verification. Bilingual schema fields are present; approved signal content is not yet generated or delivered.
