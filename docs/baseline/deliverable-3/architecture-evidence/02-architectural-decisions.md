# 02 — Major Architectural Decisions

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Deliverable:** Deliverable 3 — Architectural Context for AI-Assisted Development  
**Team Members:** Muhammad Ahmad (23i-3083) · Murtaza Hassan (25i2603) · Section SE-B  
**Date:** 15 November 2026  
**Status:** Approved by Team  

---

## Overview

This document records the human architectural decisions made by the team for the Human-Controlled Digital-Asset Advisory Application. Each decision evaluates realistic alternatives against the approved Architecturally Significant Requirements (ASRs) and cross-cutting constraints, documenting the rationale, trade-offs, and consequences.

---

## Decision D-01: Overall Architectural Style

- **Decision ID:** D-01  
- **Title:** Overall Architectural Style — Modular Monolith with Ports & Adapters (Hexagonal)  
- **Related ASRs:** ASR-01, ASR-02, ASR-03, ASR-04, ASR-05, ASR-06, ASR-07, ASR-08  
- **Related Constraints:** XC-02, XC-03, XC-04, XC-05  
- **Approval Status:** **ACCEPTED**  

### Alternatives Evaluated
1. **Traditional 3-Tier Layered Monolith (N-Tier):** Simple but prone to coupling; lacks domain encapsulation needed for zero-withdrawal security; no natural boundary for persistent WebSockets.
2. **Distributed Microservices Architecture:** Strong physical isolation, but severe operational overhead for a 2-person team; inter-service network hops add latency risking the 5-second staleness check and 60-second window; distributed transactions (Sagas) complicate multi-day state.
3. **Event-Driven Serverless (Cloud Functions):** Stateless and ephemeral; incompatible with persistent low-latency WebSocket ticker streaming; cold starts risk authorization deadlines.
4. **Modular Monolith with Hexagonal (Ports & Adapters) Internal Structure:** Single deployable unit partitioned into isolated modules with strict interface boundaries (ports) and adapters. Cross-module communication uses interfaces or in-process events.

### Team Decision & Rationale
**The team selected Alternative 4: Modular Monolith with Hexagonal Structure.**  
- **Sub-Millisecond In-Memory Guards:** Allows market price checks (>2.0%) and circuit breaker status checks (<5s latency, <15s staleness) to execute in microseconds without network overhead.  
- **Transaction Atomicity:** Plan lifecycle transitions and outbox tasks execute within atomic database transactions, avoiding distributed split-brain failure modes.  
- **Feasible for AI-Assisted Development:** Provides a unified codebase where architectural boundaries can be enforced via linting, file structure, and `AGENTS.md` instructions without container orchestration overhead.

### Trade-offs & Consequences
- *Positive:* Low operational complexity; high performance; deterministic testing.  
- *Negative / Mitigation:* Logical boundaries can be bypassed if an AI agent uses improper imports. *Mitigation:* Strict dependency rules and port definitions enforced in `AGENTS.md`.

---

## Decision D-02: Component and Module Organization

- **Decision ID:** D-02  
- **Title:** Component and Module Boundaries — Medium-Grained 8-Module Core (+ 3 TA-Provided Additional Modules)  
- **Related ASRs:** All (ASR-01 through ASR-10; ASR-11 to ASR-13 TA-provided)  
- **Related Constraints:** XC-02, XC-03, XC-04, XC-12  
- **Approval Status:** **ACCEPTED**  

### Alternatives Evaluated
1. **Coarse-Grained (5 Modules):** Merges credentials with execution, and user management with notifications. Weakens credential vault isolation.
2. **Fine-Grained (12+ Modules):** Over-engineered; adds interface overhead for simple features; increases cognitive load for coding agents.
3. **Medium-Grained (8 Modules Core + 3 TA-Provided Additions):** Isolates sensitive security and state boundaries while grouping cohesive logic.

### Team Decision & Rationale
**The team selected Alternative 3: Medium-Grained Structure.**  

#### Core Modules (Approved Baseline):
1. **Market Data Ingestion Module:** Manages exchange WebSocket connection, tick buffer, and latency/staleness circuit breaker. *(Does not depend on Plan Management, Trade Auth, or Execution).*
2. **Volatility & Asset Eligibility Module:** Evaluates rolling 1-hour price moves (>5%) and checks asset eligibility criteria. *(Does not depend on Trade Auth or Execution).*
3. **Advisory Signal Module:** Generates bilingual advisory recommendations, evaluates price-shift invalidation (>2.0%), and calculates rolling 30-day Signal Accuracy. *(Does not depend on Trade Execution).*
4. **Plan Management Module:** Encapsulates Plan Lifecycle FSM, enforces 5% capital cap, divides allocations into 3 rounded tranches, and coordinates Pause/Cancel/Restart/Adjust actions. *(Does not execute orders).*
5. **Tranche Scheduling Module:** Durable 24-hour job scheduler, authorization window timer (60s TTL), and duplicate submission prevention. *(Does not access credentials).*
6. **Trade Authorization & Execution Module:** Enforces per-tranche human verification, server-side 60s cutoff, verifies price shift and circuit breaker status, dispatches spot market buy orders, and appends to the immutable execution ledger.
7. **Credential Management Module:** Manages zero-withdrawal API key ingestion, external exchange permission verification, and encrypted storage. *(Strictly isolated; exposes no withdrawal methods).*
8. **User, Auth & Notification Module:** User registration, session authentication, 2FA OTP for PIN recovery, and asynchronous dispatch to WhatsApp and Mobile Push gateways via Transactional Outbox.

#### TA-Provided Additional Modules (Deliverable 2 Demo):
9. **Watchlist Module (FR-15 TA-Provided):** User-editable watchlist; reads market data only; strictly isolated from trading and plans.
10. **Trade History Module (FR-16 TA-Provided):** Read-only queries against execution ledger; generates CSV exports; no write paths.
11. **Investment Journal Module (FR-17 TA-Provided):** CRUD on private user notes; references plans/signals by ID for display only; zero operational hooks.

---

## Decision D-03: Data Persistence and Ownership

- **Decision ID:** D-03  
- **Title:** Data Persistence — Single Relational Database with Enforced Logical Module Ownership  
- **Related ASRs:** ASR-01, ASR-05, ASR-06, ASR-07, ASR-09, ASR-12  
- **Related Constraints:** XC-03, XC-04, XC-11  
- **Approval Status:** **ACCEPTED**  

### Alternatives Evaluated
1. **Document Database (e.g., MongoDB):** Flexible schema, but weaker multi-table transaction guarantees; schema constraints and append-only rules are harder to strictly enforce.
2. **Separate Database Per Module:** Maximum physical isolation, but requires distributed Sagas and heavy local infrastructure.
3. **Shared Relational Database with Enforced Logical Ownership:** Standard SQL ACID transactions; tables owned strictly by designated modules; cross-module access via public interfaces only. Specific database engine (PostgreSQL/SQLite) deferred to implementation.

### Team Decision & Rationale
**The team selected Alternative 3.**  
- **ACID Transactions:** Allows updating plan state, creating tranches, and inserting notification outbox records atomically.  
- **Append-Only Integrity (XC-03):** Relational tables can enforce append-only execution records (`executions` table) with database constraints or application-level repository restrictions.  
- **Defers Technology Choice:** Conforms to the instruction not to prematurely bind to a specific database product until technology stack selection.

#### Data Ownership Allocation:
- `users`, `user_credentials`, `otp_records` ➔ Owned by User & Auth
- `exchange_api_keys` (encrypted) ➔ Owned by Credential Management
- `advisory_signals`, `signal_accuracy_records` ➔ Owned by Advisory Signal
- `investment_plans` ➔ Owned by Plan Management
- `tranches`, `authorization_windows` ➔ Owned by Tranche Scheduling
- `trade_authorizations`, `executions` (append-only) ➔ Owned by Trade Authorization & Execution
- `notifications_outbox` ➔ Owned by Notification Dispatcher
- `watchlist_entries` ➔ Owned by Watchlist (TA-Provided)
- `journal_notes` ➔ Owned by Investment Journal (TA-Provided)

---

## Decision D-04: Authentication and Authorization Boundary

- **Decision ID:** D-04  
- **Title:** Authentication & Authorization — 4-Stage Structural Separation with Ephemeral Cryptographic Grant Tokens  
- **Related ASRs:** ASR-01, ASR-02, ASR-08  
- **Related Constraints:** XC-02, XC-05  
- **Approval Status:** **ACCEPTED**  

### Alternatives Evaluated
1. **Trust Mobile Client Flag:** Client performs biometrics and sends `{authorized: true}`. Rejected: Trivial to bypass/spoof; completely unacceptable for financial authorization.
2. **OTP for Every Tranche:** Server sends SMS/Email OTP per tranche. Rejected: Violates Resolved OQ-06 (which mandates native OS biometrics / PIN); OTP is strictly for PIN recovery.
3. **Device-Signed Ephemeral Order Grant Tokens (Option B):** Mobile app requests a short-lived challenge token (`tranche_id`, `expires_at`). Device OS biometrics unlock a secure enclave key that signs the assertion. Server validates signature against registered device public key and verifies timestamp $\le 60\text{s}$.
4. **Four-Stage Structural Separation:** Strictly separating User Login ➔ Plan Approval ➔ Tranche Authorization ➔ Order Dispatch.

### Team Decision & Rationale
**The team accepted the 4-Stage Structural Separation and adopted the Device-Signed Ephemeral Token pattern.**  
- **Structural Integrity:** Plan approval executes zero trades. Tranche scheduling emits prompts but cannot sign orders. Order dispatch requires a verified, unexpired authorization token.  
- **Fail-Closed Timing:** Server checks `now() <= window_expires_at` atomically with trade placement. Verifications finishing at second 61 are unconditionally rejected.  
- **Open Detail Acknowledged:** Device-change management and recovery workflows remain open implementation details under U-07/HV-14.

---

## Decision D-05: External Integration Boundaries

- **Decision ID:** D-05  
- **Title:** External Integration Boundaries — Abstracted Ports with Asynchronous Decoupling  
- **Related ASRs:** ASR-03, ASR-06, ASR-07, ASR-08, ASR-10  
- **Related Constraints:** XC-04, XC-10, XC-11  
- **Approval Status:** **ACCEPTED**  

### Alternatives Evaluated & Selected Approaches:
1. **Exchange WebSocket Feed:** Managed behind `IMarketDataFeedPort`. Reconnection and health tracking handled in adapter. Trips circuit breaker if latency > 5s or staleness > 15s (OQ-01 exchange choice preserved open).
2. **Exchange REST Trading API:** Managed behind `IExchangeTradingPort`. Adapter exposes exactly three operations: `verifyPermissions()`, `getQuoteBalance()`, `placeSpotMarketBuy()`. Contains zero withdrawal methods. Rejects keys if withdrawal permission is present or unverifiable (XC-11).
3. **WhatsApp & Mobile Push Gateways:** Decoupled via Transactional Outbox. Core engine writes message task to database; asynchronous worker pool dispatches to external gateways with strict 5-second HTTP timeouts. Tracks provider acceptance for 95% / 10s SLA without misrepresenting as end-device receipt (XC-10).
4. **OTP Delivery for PIN Recovery:** Dedicated `IOTPDeliveryPort` owned by User Auth module. Does not leak through general notification channel.
5. **Native OS Biometrics:** Abstracted through client-side biometric prompt producing device-signed authorization payloads verified by Trade Authorization.

---

## Summary of Accepted Decisions

| Decision ID | Core Architectural Selection | Approval Date |
|---|---|---|
| **D-01** | Modular Monolith with Ports & Adapters (Hexagonal Architecture) | 15 Nov 2026 |
| **D-02** | 8-Module Core (+ 3 TA-Provided Additive Modules) with Strict Boundaries | 15 Nov 2026 |
| **D-03** | Single Relational Database with Enforced Logical Table Ownership | 15 Nov 2026 |
| **D-04** | 4-Stage Separation + Device-Signed Ephemeral Authorization Tokens | 15 Nov 2026 |
| **D-05** | Abstracted Ports for Exchanges, Outbox Decoupling for Notifications, Dedicated OTP Port | 15 Nov 2026 |
