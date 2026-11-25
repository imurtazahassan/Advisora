# 04 — Architectural Context Refinement Log

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Deliverable:** Deliverable 3 — Architectural Context for AI-Assisted Development  
**Date:** 15 November 2026  
**Status:** Validated by Human Team  

---

## 1. Overview
This log documents the iterative refinements made to `architecture.md`, `AGENTS.md`, and the ADRs in response to findings identified during the critical evaluation of the AI coding agent's initial structure proposal (Step 7).

---

## 2. Refinement Log Table

| Refinement ID | Original Problem | Root Cause | Document Updated | Exact Improvement Made | Expected Effect |
|---|---|---|---|---|---|
| **REF-01** | AI proposed adding Redis (`redis_queue.ts`) for 24h tranche scheduling. | `AGENTS.md` prohibited Kafka and RabbitMQ by name, but did not explicitly forbid Redis or emphasize SQL-based job scheduling. | `AGENTS.md` §8 & `ADR-002` | Added explicit clause: *"Do not introduce Redis or external task brokers. All scheduling must rely on relational database job tables with row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`)."* | Prevents introduction of external queue daemons; keeps local development and demo completely self-contained. |
| **REF-02** | AI placed a shared `database.ts` client in `common/`, creating a database coupling risk. | Instructions stated "no cross-module database queries" but did not forbid a centralized database client or export directory. | `AGENTS.md` §5 & `ADR-003` | Explicitly prohibited shared database models in `common/`. Mandated that each module must define its own private repository implementations, exposing data only via DTOs through public port interfaces. | Eliminates cross-module direct table queries; enforces compile-time boundary encapsulation. |
| **REF-03** | AI omitted explicit Transactional Outbox workers in `user_notifications`. | `AGENTS.md` mentioned the outbox pattern under coding conventions, but did not mandate an explicit module directory structure for it. | `architecture.md` §12 & `AGENTS.md` §4 | Added explicit outbox worker pool specification: `user_notifications/outbox/` with dedicated worker and repository interfaces. | Ensures AI scaffolds the outbox queue and decoupled worker pool required to satisfy the 95% / 10s SLA. |

---

## 3. Re-Evaluation of AI-Proposed Structure (Round 2)

Following the context updates, the AI coding agent was given the updated `architecture.md`, `AGENTS.md`, and ADR files and asked to re-evaluate the project structure.

### Revised AI Proposal:
```
src/
├── api/
│   ├── middleware/
│   └── routes.ts
├── common/
│   ├── event_bus/
│   │   └── in_process_event_bus.ts
│   └── exceptions/
│       ├── price_shift.exception.ts
│       ├── market_stale.exception.ts
│       └── auth_expired.exception.ts
├── modules/
│   ├── market_ingestion/
│   │   ├── ports/
│   │   │   └── market_data.port.ts
│   │   ├── adapters/
│   │   │   └── exchange_websocket.adapter.ts
│   │   └── internal/
│   │       ├── circuit_breaker.ts
│   │       └── ring_buffer.ts
│   ├── volatility_eligibility/
│   │   ├── ports/
│   │   └── services/
│   ├── advisory_engine/
│   │   ├── ports/
│   │   └── services/
│   ├── plan_management/
│   │   ├── ports/
│   │   ├── domain/
│   │   └── repositories/      <-- [Private to plan_management]
│   ├── tranche_scheduling/
│   │   ├── ports/
│   │   ├── scheduler/
│   │   │   └── sql_job_scheduler.ts  <-- [CORRECTED: DB-backed, No Redis]
│   │   └── repositories/
│   ├── trade_execution/
│   │   ├── ports/
│   │   ├── repositories/
│   │   │   └── execution_ledger.repository.ts  <-- [Append-Only enforced]
│   │   └── services/
│   ├── credential_management/
│   │   ├── ports/
│   │   ├── security/
│   │   │   ├── aes_gcm_vault.ts
│   │   │   └── zero_withdrawal_gate.ts
│   │   └── repositories/
│   ├── user_notifications/
│   │   ├── ports/
│   │   ├── outbox/
│   │   │   ├── outbox_worker.ts               <-- [CORRECTED: Outbox Worker added]
│   │   │   └── outbox.repository.ts
│   │   └── adapters/
│   │       ├── whatsapp.adapter.ts
│   │       └── push_fcm.adapter.ts
│   ├── watchlist/              <-- [Isolated: Read-only market consumer]
│   ├── trade_history/          <-- [Isolated: Read-only ledger consumer]
│   └── investment_journal/     <-- [Isolated: Independent note CRUD]
└── config/
```

### Human Verification of Improvements:
1. ✅ **Redis Completely Removed:** Replaced with `sql_job_scheduler.ts` operating on relational tables.
2. ✅ **Shared Database Eliminated:** `common/database.ts` was deleted. Each module encapsulates its own private repository.
3. ✅ **Transactional Outbox Scaffolding Added:** `outbox_worker.ts` and `outbox.repository.ts` are explicitly placed in `user_notifications`.
4. ✅ **Zero Architectural Drift:** All 14 evaluation criteria were systematically addressed. The architectural context is confirmed coherent, robust, and ready to guide implementation.
