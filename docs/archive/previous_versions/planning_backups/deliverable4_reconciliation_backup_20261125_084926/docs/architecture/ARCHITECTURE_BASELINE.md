# Architecture Baseline — Deliverable 4

**Project:** Human-Controlled Digital-Asset Advisory Application
**Status:** Initial implementation baseline
**Architecture:** Modular Monolith with Ports and Adapters

## 1. Architectural principles

- Maintain a Modular Monolith.
- Apply Ports and Adapters at external integration boundaries.
- Keep business rules inside their owning modules.
- Modules own their repositories and logical data access.
- Do not introduce a shared database client in common/.
- Use relational database-backed scheduling.
- Do not introduce Redis.
- Use a Transactional Outbox for notification dispatch.
- Preserve approved Deliverable 3 requirements.
- Keep unresolved open questions unresolved until formally decided.

## 2. Initial module boundaries

| Module | Responsibility |
|---|---|
| user_access | User authentication and device trust |
| market_data | Market data, freshness and asset eligibility |
| advisory | Advisory signal generation and validity |
| investment_plan | Investment plan and allocation management |
| authorization | Human authorization and tranche scheduling |
| trade_execution | Authorized execution and execution ledger |
| notifications | Notification creation and dispatch |
| watchlist | User watchlist |
| trade_history | Historical execution records |
| investment_journal | User investment journal |

These are logical boundaries. Physical folder and package structure will follow the verified technology stack.

## 3. External integration boundaries

External exchange and notification providers must be accessed through defined ports and adapters.

Implementation and testing must use mock/test integrations only. No live trading or real financial transactions.

## 4. Critical business constraints

- Signal expiry: 60 seconds.
- Price-shift invalidation: strictly greater than 2.0%.
- Market-data ticker latency above 5 seconds locks Buy.
- Market-data staleness above 15 seconds locks Buy.
- Allocation cap: 5% of exchange quote balance.
- Three equal tranches, rounded down according to the baseline.
- Each tranche requires its own PIN/biometric authorization.
- Authorization expires after 60 seconds.
- An unapproved tranche expires and is permanently skipped.
- Pause/cancel preserves executed tranches and revokes open prompts.
- Resume must not backfill missed tranches.
- Execution ledger is append-only.
- No withdrawal or external transfer functionality.
- A 3% loss threshold is measurement-only, not forced closure.

## 5. Architecture dependency direction

- Domain rules must not depend on external provider implementations.
- Application use cases coordinate domain behavior through ports.
- Adapters implement external interfaces.
- Module data access remains owned by its module.
- Cross-module interaction must respect defined module interfaces.

## 6. Open decisions

The following remain open and must not be silently decided during implementation:

- OQ-01: Exchange and technology stack.
- OQ-04: Exchange outage behavior.
- OQ-05: Resume and scheduling details.
- OQ-07: Audio summaries.
- OQ-08: Signal Accuracy calculation and display.
- OQ-09: Remaining PRD decision.

## 7. First implementation milestone

1. Verify the existing repository and technology stack.
2. Establish the application foundation.
3. Establish module boundaries and interfaces.
4. Add configuration and test infrastructure.
5. Implement the first vertical slice using mock integrations.
6. Validate against approved acceptance criteria.

## 8. Change control

This document does not authorize changes to approved Deliverable 3 requirements. Any unresolved requirement remains subject to its recorded open question and approval process.
