# 03 — AI-Proposed Structure Evaluation

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Deliverable:** Deliverable 3 — Architectural Context for AI-Assisted Development  
**Date:** 15 November 2026  
**Evaluators:** Muhammad Ahmad (23i-3083) & Murtaza Hassan (25i2603)  
**Context Files Provided to AI Agent:** `PRD.md`, `architecture.md`, `AGENTS.md`, and all files in `ADR/`.

---

## 1. Initial AI Coding Agent Proposal

When provided with the complete architectural context and prompted according to Task 6 instructions, the AI coding agent proposed the following initial project structure:

```
src/
├── api/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── rate_limit.middleware.ts
│   └── routes.ts
├── common/
│   ├── database.ts              <-- [CRITICAL FINDING: Shared DB Client]
│   ├── event_bus.ts
│   └── exceptions.ts
├── modules/
│   ├── market_ingestion/
│   │   ├── ports/
│   │   ├── adapters/
│   │   └── services/
│   ├── volatility_eligibility/
│   │   ├── ports/
│   │   └── services/
│   ├── advisory_engine/
│   │   ├── ports/
│   │   └── services/
│   ├── plan_management/
│   │   ├── ports/
│   │   └── services/
│   ├── tranche_scheduling/
│   │   ├── queue/
│   │   │   └── redis_queue.ts   <-- [CRITICAL FINDING: Unapproved Redis]
│   │   └── workers/
│   ├── trade_execution/
│   │   ├── ports/
│   │   └── services/
│   ├── credential_management/
│   │   ├── ports/
│   │   └── services/
│   ├── user_notifications/
│   │   ├── ports/
│   │   └── adapters/
│   ├── watchlist/
│   ├── trade_history/
│   └── investment_journal/
└── config/
```

---

## 2. Human Critical Evaluation Matrix (Task 7)

The human engineering team evaluated the AI's proposal against the 14 evaluation criteria:

| Finding ID | AI Proposal Element | Evaluation Result | Detailed Problem or Strength | Related ASR / ADR | Team Decision |
|---|---|---|---|---|---|
| **EV-01** | 8 Core Modules + 3 TA-Provided Modules | **Strength** | Directly implements the 8-module core and isolates the 3 TA-provided client requirements (`watchlist`, `trade_history`, `investment_journal`). | ASR-01 to ASR-13, ADR-002 | **Accepted** |
| **EV-02** | Hexagonal Ports & Adapters Subdirectories | **Strength** | Each module features dedicated `ports/` and `adapters/` folders, enforcing dependency inversion. | ADR-001, ADR-002 | **Accepted** |
| **EV-03** | Shared `common/database.ts` Client | **Problem** | The AI created a single shared database connection pool in `common/` that exports all database models. This would allow `plan_management` to directly import and query `credential_management` tables, violating logical schema boundaries. | ADR-003, AGENTS.md §5 | **Rejected** *(Require each module to own its private repository, exposing data only via ports)* |
| **EV-04** | Redis Task Queue (`redis_queue.ts`) | **Problem** | The AI proposed adding Redis for multi-day tranche scheduling. This violates ADR-002 and ADR-003, which mandate durable relational database scheduling with row-level locks, avoiding unapproved external daemons. | ASR-05, ADR-002, AGENTS.md §8 | **Rejected** *(Enforce database-backed job scheduler without Redis)* |
| **EV-05** | Append-Only Execution Ledger in `trade_execution` | **Strength** | Preserves execution records as append-only; excludes any `UPDATE` or `DELETE` repository methods. | XC-03, ADR-003 | **Accepted** |
| **EV-06** | Zero-Withdrawal Handshake Gate in `credential_management` | **Strength** | The exchange adapter implements live capability checks during key ingestion; rejects keys if `enableWithdrawals == true`. | ASR-06, XC-04, ADR-004 | **Accepted** |
| **EV-07** | Ephemeral Biometric Grant Token in `trade_execution` | **Strength** | Atomic validation of server-side 60s window (`now <= expires_at`) and biometric signature before order dispatch. | ASR-01, ASR-08, ADR-004 | **Accepted** |
| **EV-08** | In-Memory Sliding Buffer & Circuit Breaker in `market_ingestion` | **Strength** | Implements continuous latency monitoring (<5s) and staleness checking (<15s) with fail-closed locks. | ASR-03, XC-06, ADR-003 | **Accepted** |
| **EV-09** | Missing Explicit Outbox Repository in `user_notifications` | **Problem** | The AI drafted notification adapters but omitted the explicit `notifications_outbox` table repository and background worker pool required by ADR-005. | ASR-07, ADR-005 | **Accepted with Modification** *(Add explicit outbox worker and repository)* |
| **EV-10** | TA-Provided Modules Isolated from Trading Logic | **Strength** | `watchlist`, `trade_history`, and `investment_journal` have zero dependencies or import routes to `trade_execution`. | ASR-11, ASR-12, ASR-13 | **Accepted** |

---

## 3. Summary of Identified Violations & Gaps
1. **Unapproved Infrastructure (Redis):** AI attempted to introduce Redis for background queueing, violating ADR-002 and the technology restrictions in `AGENTS.md`.
2. **Boundary Leak Risk (Shared DB):** Placing a generic database client in `common/` creates a hazard where modules can bypass public ports and execute raw SQL against foreign tables.
3. **Missing Outbox Component:** The outbox worker was only implicitly implied rather than explicitly scaffolded.

These findings formed the basis for the architectural context refinements documented in `04-architecture-refinement-log.md`.
