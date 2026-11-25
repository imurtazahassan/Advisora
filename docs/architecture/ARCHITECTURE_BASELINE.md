# Architecture Baseline — Deliverable 4

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Status:** Reconciled implementation planning baseline; readiness verification pending  
**Architecture:** Modular Monolith with Ports and Adapters  
**Accepted technology stack:** TypeScript, NestJS, React and PostgreSQL  
**Integration mode:** Mock/test only; no live trading or real financial transactions

## 1. Architectural Principles

- Maintain a Modular Monolith.
- Apply Ports and Adapters at external integration boundaries.
- Keep business rules inside their owning modules.
- Modules own their repositories and logical data access.
- Do not introduce a shared database client in `common/`.
- Use PostgreSQL for relational persistence and durable scheduling.
- Do not introduce Redis.
- Use a Transactional Outbox for notification dispatch.
- Preserve approved Deliverable 3 requirements and ADR decisions.
- Keep unresolved implementation specifications explicitly recorded.

## 2. Approved Module Boundaries

| Module | Responsibility |
|---|---|
| `market_ingestion` | WebSocket lifecycle, tick buffering, market-data latency and staleness |
| `volatility_eligibility` | Asset eligibility and one-hour volatility suppression |
| `advisory_engine` | Bilingual recommendations, signal validity and Signal Accuracy |
| `plan_management` | Allocation cap, plan lifecycle and three-tranche plan setup |
| `tranche_scheduling` | Durable 24-hour scheduling, authorization expiry and duplicate protection |
| `trade_execution` | Authorized spot-order dispatch and append-only execution records |
| `credential_management` | Exchange API-key permission verification and encrypted credential storage |
| `user_notifications` | User accounts, sessions, OTP recovery and notification outbox responsibilities |
| `watchlist` | User-editable watchlist; no execution or plan side effects |
| `trade_history` | Read-only execution history and CSV export |
| `investment_journal` | Private notes, decoupled from execution and authorization |

The eight core modules and three TA-provided supporting modules retain the responsibilities defined in ADR-002.

### 2.1 Vertical Slice Crosswalk

| Vertical Slice | Primary Module Responsibilities |
|---|---|
| VS-01 | User/session responsibilities in `user_notifications`; device trust boundary |
| VS-02 | `market_ingestion`, `volatility_eligibility` |
| VS-03 | `advisory_engine` |
| VS-04 | `plan_management` |
| VS-05 | `tranche_scheduling` and authorization boundary |
| VS-06 | `trade_execution`, `credential_management` |
| VS-07 | Notification/outbox responsibilities in `user_notifications` |
| VS-08 | `watchlist`, `trade_history`, `investment_journal`, accuracy reporting |
| VS-09 | Cross-cutting integration, testing and quality validation |

## 3. External Integration Boundaries

- Exchange market data uses an inbound market-data port.
- Exchange order placement uses a strictly scoped trading port.
- Notification providers use notification ports and asynchronous outbox dispatch.
- OTP delivery is isolated behind its delivery port.
- External providers must not own application business rules.
- Initial exchange integration is simulated.
- No production exchange provider has been selected.
- No withdrawal or transfer operation is exposed.
- If withdrawal permissions cannot be verified absent, the exchange key remains inactive.

All implementation and testing must use mock/test integrations only. No live trading or real financial transactions are authorized.

## 4. Persistence and Data Ownership

- Use PostgreSQL as the accepted relational database.
- Each module owns its repositories and logical data access.
- Cross-module access must use the owning module's public interface or repository port.
- Do not introduce shared database access in `common/`.
- Use durable relational scheduling; do not introduce Redis.
- Use a Transactional Outbox for notification dispatch.
- Preserve atomic plan, tranche and outbox operations where required.
- Execution records remain append-only.
- Trade history reads execution records without owning or mutating the execution ledger.
- Preserve ADR-003 logical ownership and encryption requirements.

## 5. Critical Business Constraints

- Advisory signal expiry: exactly 60 seconds.
- Price-shift invalidation: upward movement strictly greater than 2.0%.
- Exactly 2.0% does not trigger invalidation.
- Market-data ticker latency greater than 5 seconds locks Buy.
- Market-data staleness greater than 15 seconds locks Buy.
- Allocation cap: no more than 5% of the applicable exchange quote balance under the approved PRD rules.
- Three equal tranches at fixed 24-hour intervals.
- Each tranche requires its own PIN/biometric authorization.
- Plan setup executes zero trades.
- Authorization expires after 60 seconds using trusted server-side time.
- An unauthorized tranche expires and is permanently skipped.
- Pause/cancel preserves executed tranches and revokes open prompts.
- Resume applies only to future eligible tranches; no backfill.
- Exchange outage recovery must reconcile uncertain outcomes without blind retries.
- Execution ledger is append-only.
- No withdrawal or external transfer functionality.
- A 3% loss threshold is measurement-only, not forced closure.
- High volatility means movement strictly greater than 5% in either direction within one hour; exact reference and reset mechanics remain specification work.
- Notification provider acceptance is not confirmed device delivery.

## 6. Accepted Decisions and Remaining Specifications

| Decision | Accepted Direction |
|---|---|
| OQ-01 | TypeScript, NestJS, React, PostgreSQL; simulated initial exchange adapter |
| OQ-04 | Fail safely, reconcile uncertain outcomes, idempotency protection, no blind retries |
| OQ-05 | Resume future eligible tranches only; no backfill |
| OQ-07 | Optional audio summaries generated from approved written summaries |
| OQ-08 | Rolling 30-day outcome-based Signal Accuracy; measurement-only |
| OQ-09 | Adopt documented measurable quality targets |

The following details remain unresolved and must not be invented during implementation:

- Production exchange-provider selection.
- Signal Accuracy outcome definition, evaluation horizon and minimum sample size.
- Global spot-volume ranking source.
- Objective high-risk and illiquidity criteria.
- Volatility reference price, rolling-window calculation and reset logic.
- Allocation minimum and numeric precision.
- Remaining authentication fallback details.

## 7. Architecture Dependency Direction

- Domain rules must not depend on external provider implementations.
- Application use cases coordinate domain behavior through ports.
- Adapters implement external interfaces.
- Module data access remains owned by its module.
- Trade execution requires independently verified human authorization.
- Scheduling must not bypass the authorization boundary.
- Notification delivery must not block core authorization or execution workflows.

## 8. First Implementation Milestone

1. Verify the existing repository against the accepted TypeScript, NestJS, React and PostgreSQL stack.
2. Establish the application foundation and configuration.
3. Establish module boundaries and interfaces from ADR-002.
4. Implement persistence ownership and durable scheduling.
5. Add automated test infrastructure.
6. Implement the first vertical slice using mock integrations.
7. Validate against approved acceptance criteria and quality targets.

## 9. Change Control and Readiness

This document does not authorize changes to approved Deliverable 3 requirements or ADRs.

Project-owner authorization to proceed with Deliverable 4 planning and implementation has been given. Objective implementation-readiness verification remains pending.

No implementation, integration, security or quality test completion is claimed by this baseline.