# AGENTS.md — AI Coding Agent Operational Instructions & Architectural Boundaries

**Project:** Human-Controlled Digital-Asset Advisory Application  
**Target Audience:** AI Coding Agents, Automated Code Generation Tools, Human Pair Programmers  
**Authoritative Documents:**
1. Primary Requirements: [PRD.md](PRD.md)
2. Architectural Baseline: [architecture.md](architecture.md)
3. Architectural Decision Records: [ADR Repository](ADR/)

---

## 1. Project Intent & Core Philosophy
You are generating or refactoring code for the **Human-Controlled Digital-Asset Advisory Application**, built for non-technical retail savers seeking inflation protection.

### Cardinal Rule:
> **The system is strictly an ADVISORY ASSISTANT, NEVER an autonomous trading bot.**  
> Under no circumstances may code be written, refactored, or generated that executes trades automatically, bypasses per-tranche PIN/biometric verification, or introduces withdrawal/fund-transfer capabilities.

---

## 2. Required Context Files
Before proposing or writing any code, you must read:
- `PRD.md` (Product Requirements Document)
- `architecture.md` (Software Architecture Baseline)
- All ADRs in `ADR/` (`ADR-001` through `ADR-005`)

---

## 3. Source of Truth Hierarchy
If you identify conflicts across project files, observe the following strict precedence:
1. **Security & Safety Constraints:** Fail-closed financial safety rules always supersede feature requests.
2. **Accepted ADRs:** Take precedence over generalized design patterns.
3. **`architecture.md`:** Authoritative specification for component boundaries and interfaces.
4. **`PRD.md`:** Authoritative baseline for functional requirements, business rules, and thresholds.
5. **`AGENTS.md`:** Authoritative guide for agent coding behavior and boundaries.

*If an unresolved conflict is detected, stop immediately and ask human engineers for clarification.*

---

## 4. Approved Module Boundaries
The project strictly follows the **Modular Monolith with Hexagonal Ports & Adapters** architecture (`ADR-001`, `ADR-002`). You must maintain the following isolated modules:

```
src/
├── market_ingestion/        # WebSocket client, tick ring buffer, latency/staleness circuit breaker
├── volatility_eligibility/  # 1h price delta calculation (>5%), asset eligibility checks
├── advisory_engine/         # Advisory signal generator, bilingual formatter, 30d cohort accuracy
├── plan_management/         # Plan lifecycle FSM, 5% capital cap validator, 3-tranche calculator
├── tranche_scheduling/      # Durable 24h job queue, 60s authorization window timer
├── trade_execution/         # Biometric token verifier, exchange spot buyer, append-only ledger
├── credential_management/   # Zero-withdrawal handshake gate, encrypted API key store
├── user_notifications/      # Session auth, 2FA OTP PIN recovery, outbox worker (WhatsApp & FCM)
├── watchlist/               # (TA-Provided FR-15) User watchlist; read-only market feed consumer
├── trade_history/           # (TA-Provided FR-16) Confirmed trade viewer; CSV export; read-only ledger
└── investment_journal/      # (TA-Provided FR-17) Private note CRUD; decoupled from financial logic
```

---

## 5. Dependency & Interface Rules
1. **No Circular Dependencies:** Dependencies must flow strictly inward from outer adapters toward core domain ports.
2. **Explicit Port Interfaces Only:** Modules must communicate exclusively via defined port interfaces (e.g., `IMarketDataPort`, `IExecutionVaultPort`, `IPlanSchedulingPort`). Direct cross-module class instantiation is prohibited.
3. **No Direct Cross-Module Database Queries:** A module must **never** query or mutate another module’s tables directly.
   - `plan_management` must NEVER access `exchange_api_keys` in `credential_management`.
   - `watchlist`, `trade_history`, and `investment_journal` must NEVER call trade execution methods.
4. **Asynchronous Decoupling via Event Bus / Outbox:** Cross-module notifications, circuit breaker trips, and signal invalidations must be published to the in-process Event Bus or Transactional Outbox, never via hardcoded synchronous dependencies.

---

## 6. Critical Security Rules You MUST Enforce
1. **Zero-Withdrawal Constraint (C-02, FR-14, BR-11, XC-04, ADR-004):**
   - You must **never** create data models, API endpoints, SDK methods, or utility classes capable of initiating withdrawals or external transfers.
   - During API key ingestion, the code must call the exchange API to verify `enableWithdrawals == false`. If `true` or unverifiable, the key must be immediately rejected and never stored (XC-11).
2. **Mandatory Human-in-the-Loop per Tranche (C-01, FR-06, BR-03, ADR-004):**
   - Plan approval sets up parameters but executes **zero** trades.
   - Every individual tranche order requires an explicit, verified PIN or biometric authorization grant token.
   - The authorization must complete within the strict **60-second window** (`now <= expires_at`). If verification completes at second 61, the order must fail closed and the tranche permanently skipped (XC-05).
3. **Strict Greater-Than Semantics (XC-01, PRD Section 6):**
   - Price shift invalidation triggers **only when price increase is strictly $> 2.0\%$**. Exactly 2.0% does not trigger.
   - Volatility suppression triggers **only when price movement is strictly $> 5.0\%$**.
   - Maximum loss limit for signal accuracy is **strictly $> 3.0\%$**.
   - Maximum plan allocation is **$\le 5.0\%$** of available quote balance (e.g., USDT/USD). Any value $> 5.0\%$ is rejected.
4. **Market Data Safeguards & Circuit Breaker (ADR-003, XC-06):**
   - If ticker latency exceeds **5 seconds** OR market data age exceeds **15 seconds** during an active authorization window, lock the Buy action, display `"Market Data Unavailable"`, and reject authorization.
5. **Ledger Immutability (XC-03, ADR-003):**
   - Executed tranche records (`executions` table) are **append-only**. You must never generate code that updates, deletes, or rolls back an executed trade. Pausing or cancelling a plan leaves executed tranches intact.
6. **Non-Retroactive Resumption (XC-07, BR-10):**
   - Resuming a paused plan must **never** execute missed intervals retroactively or immediately. The next remaining tranche must anchor to the next applicable 24-hour interval.

---

## 7. Data Ownership Rules
- `user_notifications` owns `users`, `user_credentials`, `otp_records`, and `notification_outbox`.
- `credential_management` owns `exchange_api_keys` (encrypted at rest via AES-256-GCM).
- `advisory_engine` owns `advisory_signals` and `signal_accuracy_records`.
- `plan_management` owns `investment_plans` (enforces `version_id` for optimistic concurrency).
- `tranche_scheduling` owns `tranches` and `authorization_windows`.
- `trade_execution` owns `trade_authorizations` and `executions` (strictly append-only).
- `watchlist` owns `watchlist_entries`.
- `investment_journal` owns `journal_notes`.

---

## 8. Technology Restrictions
- **No Unapproved Infrastructure:** Do not introduce external message brokers (Kafka, RabbitMQ), separate microservice daemons, or unapproved caching layers (e.g., Redis) without explicit human architectural approval.
- **Database Engine:** Use standard relational database mechanisms (SQL transactions, row-level locking for scheduler jobs). Specific DB product selection is deferred.
- **Encryption:** Use standard AES-256-GCM envelope encryption for credentials.

---

## 9. Coding Conventions
- **Explicit Domain Exceptions:** Throw specific exceptions (`PriceShiftExceededException`, `MarketDataStaleException`, `AuthorizationWindowExpiredException`, `WithdrawalPermissionsForbiddenException`). Never throw generic `Error` or `Exception`.
- **Transactional Outbox for Notifications:** Never make synchronous external HTTP calls to WhatsApp or FCM inside the request path. Always write to `notification_outbox` within the active transaction.
- **Fail-Closed Principle:** If any validation or network check fails or times out, reject the trade authorization immediately.

---

## 10. AI Agent Permissions & Approval Gates
The AI agent is permitted to inspect files, propose scaffolding, draft domain entities, and write unit tests.  
The AI agent **MUST STOP and request human approval** before:
1. Introducing any external library, framework, or message broker not documented in `architecture.md`.
2. Altering any approved numerical threshold (5% cap, 2.0% price shift, 5.0% volatility, 3.0% loss limit, 60s TTL, 24h interval).
3. Modifying the module partitioning or introducing cross-module database queries.
4. Adding autonomous trading triggers or bypasses to biometric authorization.
5. Resolving an open question (OQ-01, OQ-04, OQ-05, OQ-07, OQ-08, OQ-09).

---

## 11. Ambiguity Handling
If an instruction or requirement is unclear:
1. Do not make assumptions or silently choose an implementation.
2. Check `architecture.md` first, then the relevant `ADR/`, then `PRD.md`.
3. If still unresolved, flag the ambiguity explicitly and request guidance from human engineers.

---

## 12. Testing Expectations
Every edge case specified in PRD Section 6 must have corresponding test cases verifying fail-closed behavior:
- Expiry after 60 seconds (second 61 fails closed).
- Exactly 2.0% price shift does not trip; 2.01% trips.
- Exactly 5.0% volatility does not trip; 5.01% trips.
- Keys with withdrawal permissions are 100% rejected.
- Pausing revokes open authorization windows immediately.
- Resuming does not trigger retroactive orders.
