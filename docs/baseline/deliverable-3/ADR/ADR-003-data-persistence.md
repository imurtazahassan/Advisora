# ADR-003: Data Persistence and Schema Ownership

## Status
**Accepted**

## Date
15 November 2026

## Context
The application manages financially sensitive data: encrypted exchange API keys, investment plans, scheduled tranches, audit logs, advisory signals, and trade execution records. Persistence must survive server restarts over multi-day periods, guarantee ACID transactions, enforce an append-only ledger for executions, and prevent unauthorized cross-module database mutations.

## Related ASRs
- **ASRs:** ASR-01, ASR-05, ASR-06, ASR-07, ASR-09, ASR-12 (TA-provided)
- **Constraints:** XC-03, XC-04, XC-11

## Alternatives Considered

### Alternative 1: Document Database (e.g., MongoDB)
- **Description:** Storing entities as JSON documents.
- **Pros:** Rapid schema changes.
- **Cons:** Weaker multi-collection ACID transactions; enforcing append-only immutability on execution records is convention-only; referential integrity between plans and tranches is not database-enforced.

### Alternative 2: Separate Physical Databases per Module
- **Description:** Dedicated micro-database instance per module.
- **Pros:** Hard physical isolation.
- **Cons:** Requires distributed 2-phase commits or Saga orchestrators for atomic plan creation and notification enqueueing; high operational overhead for local testing.

### Alternative 3: Shared Relational Database with Enforced Logical Ownership (Selected)
- **Description:** A single relational SQL database where each table is strictly owned by one domain module. No module may directly query or mutate another module’s tables; access occurs exclusively through the owning module’s public repository port.

## Decision
The team selects **Alternative 3: Shared Relational Database with Enforced Logical Ownership**. Specific database engine (e.g., PostgreSQL for production, SQLite for local dev/testing) is deferred to technology stack selection.

### Table Ownership Mapping:
| Module | Owned Tables | Access Restrictions |
|---|---|---|
| `user_notifications` | `users`, `user_credentials`, `otp_records`, `notification_outbox` | Private to module |
| `credential_management` | `exchange_api_keys` | Encrypted at rest; accessed only via credential port |
| `advisory_engine` | `advisory_signals`, `signal_accuracy_records` | Read by execution/scheduling; write by advisory |
| `plan_management` | `investment_plans` | Mutated by plan FSM; includes `version_id` for locking |
| `tranche_scheduling` | `tranches`, `authorization_windows` | Scheduled intervals; mutated by scheduler |
| `trade_execution` | `trade_authorizations`, `executions` | **`executions` is strictly APPEND-ONLY (XC-03)** |
| `watchlist` (TA-Provided) | `watchlist_entries` | User-isolated; no financial table links |
| `investment_journal` (TA-Provided) | `journal_notes` | Private notes; references plan/signal IDs only |

## Rationale
- **Atomic Operations:** Creating an approved plan, setting up 3 tranches, and inserting notification outbox tasks occurs atomically in a single ACID transaction.
- **Immutable Ledger (XC-03):** The `executions` table is append-only. Application repositories forbid `UPDATE` and `DELETE` queries on this table, guaranteeing an incorruptible financial audit trail.
- **Optimistic Locking:** Tables supporting concurrent state changes (`investment_plans`, `tranches`) incorporate a `version_id` column to prevent race conditions during rapid user clicks (e.g., Pause/Resume).

## Trade-offs and Consequences
- **Benefits:** Relational integrity, atomic consistency, simple local backups and test setups.
- **Limitations:** Logical table ownership must be strictly respected by developers and AI agents.
- **Mitigation:** Documented in `AGENTS.md`; foreign keys reference IDs without enabling cross-module cascading mutations.

## Security Implications
API keys are encrypted at rest using envelope encryption (AES-256-GCM). Plaintext keys exist only in memory during signed order placement.

## Dependencies
Relies on ADR-001 (Modular Monolith) and ADR-002 (Boundaries).

## Human Approval
- **Approved by:** Muhammad Ahmad (23i-3083) and Murtaza Hassan (25i2603)
- **Status:** Accepted (15 November 2026)
