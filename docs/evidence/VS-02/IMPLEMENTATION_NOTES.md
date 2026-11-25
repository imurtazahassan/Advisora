# VS-02 Implementation Notes

**Status:** IN PROGRESS — implementation present; build, database and acceptance verification pending.

## Implemented in this work package

- Added the `market_ingestion` NestJS module using an inbound provider port.
- Added a deterministic simulated provider for BTC/USDT and ETH/USDT. It is explicitly labeled simulated and is not represented as live market data.
- Added PostgreSQL migration `003_market_data.sql` for configured assets and append-only tick observations.
- Added authenticated `GET /market-data` and `POST /market-data/refresh` endpoints.
- Recorded provider event time, server receive time, calculated ticker latency and source classification.
- Classified missing data and data older than 15 seconds as stale.
- Locked Buy when ticker latency is strictly greater than 5 seconds.
- Added dashboard market overview and explicit simulated-data labeling.
- Added pure policy tests for missing data, exact threshold boundaries and over-threshold conditions.

## Deliberately not implemented

The approved decision register and acceptance criteria leave the following specifications unresolved: global spot-volume ranking source, objective liquidity/high-risk criteria, and volatility reference price, rolling window and reset mechanics. This implementation does not invent those rules. Fresh data is classified `PENDING_POLICY`, and `actionable_advisory_allowed` remains false until the missing policy is approved and implemented.

## Operational prerequisite

Apply migrations in order, including `003_market_data.sql`, before calling the market-data endpoints. The repository currently has no automatic migration runner; do not assume migrations are applied at application startup.
