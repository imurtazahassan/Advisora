# ADR-002: Component and Module Boundaries

## Status
**Accepted**

## Date
15 November 2026

## Context
The system encompasses diverse, sensitive domains: financial trading, real-time streaming, biometric authorization, multi-day scheduling, and external messaging. Clear component boundaries must prevent improper coupling, such as a scheduler directly submitting trades or a watchlist triggering orders.

## Related ASRs
- **ASRs:** All (ASR-01 through ASR-10, and TA-provided ASR-11 to ASR-13)
- **Constraints:** XC-02, XC-03, XC-04, XC-12

## Alternatives Considered

### Alternative 1: Coarse-Grained 5-Module Structure
- **Description:** Market Data, Advisory, Plan & Scheduling, Trade Execution (including credentials), User & Notifications.
- **Pros:** Fewer boundaries.
- **Cons:** Mixes credential vault security with general trade execution; merges unrelated user management with notification dispatchers.

### Alternative 2: Fine-Grained 12+ Module Structure
- **Description:** Every sub-feature (Watchlist, Journal, CSV, Localization, Analytics, Tranche Scheduler, Plan FSM) is a distinct module.
- **Pros:** Maximum isolation.
- **Cons:** Excessive interface overhead; awkward cross-boundary interactions for a 2-person development scope.

### Alternative 3: Medium-Grained 8-Module Core (+ 3 TA-Provided Additional Modules) (Selected)
- **Description:** Partitions the core domain into 8 isolated modules, while accommodating the 3 TA-provided client additions (Watchlist, Trade History, Journal) as strictly isolated, non-intrusive additive modules.

## Decision
The team selects **Alternative 3: Medium-Grained 8-Module Core (+ 3 TA-Provided Modules)**.

### Module Responsibilities & Allowed Boundaries:
1. **`market_ingestion`**: WebSocket connection lifecycle, tick buffer, latency/staleness circuit breaker. *(Inbound only to other modules; depends on external exchange WS).*
2. **`volatility_eligibility`**: Evaluates 1-hour rolling volatility (>5%) and verifies asset eligibility criteria. *(Depends on market data; no execution path).*
3. **`advisory_engine`**: Generates bilingual recommendations, evaluates price-shift invalidation (>2.0%), and tracks rolling 30-day Signal Accuracy. *(Does not depend on execution).*
4. **`plan_management`**: Encapsulates Plan Lifecycle FSM, enforces 5% capital cap, divides allocations into 3 rounded tranches, and coordinates Pause/Cancel/Restart/Adjust. *(Executes zero trades).*
5. **`tranche_scheduling`**: Durable 24-hour scheduler, tracks authorization window TTL (60s), prevents duplicate submissions. *(Does not store credentials; communicates with execution via authorization).*
6. **`trade_execution`**: Gated by verified authorization token; checks market freshness; dispatches spot market buy orders; writes append-only execution records.
7. **`credential_management`**: Validates read+trade permissions (rejects withdrawal keys); encrypts credentials; strictly isolated.
8. **`user_notifications`**: User accounts, login sessions, 2FA OTP for PIN recovery, and asynchronous outbox dispatch for WhatsApp and Push.

#### TA-Provided Additional Modules (Deliverable 2 Demo):
9. **`watchlist` (FR-15 TA-Provided)**: User-editable watchlist; reads market data only; zero write or trigger paths to trading.
10. **`trade_history` (FR-16 TA-Provided)**: Read-only queries against execution ledger; generates CSV exports; immutable.
11. **`investment_journal` (FR-17 TA-Provided)**: Private note CRUD; references plans/signals by ID for display only; completely decoupled.

## Rationale
- Strictly isolates credentials (`credential_management`) from execution logic.
- Separates scheduling (`tranche_scheduling`) from trade execution (`trade_execution`), enforcing that scheduling events alone can never trigger trade placement (XC-02).
- Ensures TA-provided modules (FR-15, FR-16, FR-17) can be added or removed without impacting core trading safety.

## Trade-offs and Consequences
- **Benefits:** Unambiguous ownership; clear import barriers for AI coding agents; strict compliance with safety rules.
- **Limitations:** Requires defining formal port interfaces for cross-module communication.

## Security Implications
Enforces the principle of least privilege: only `trade_execution` interacts with `credential_management`, and only when presented with a valid authorization token.

## Dependencies
Depends on ADR-001 (Modular Monolith). Establishes the boundaries governed in `AGENTS.md`.

## Human Approval
- **Approved by:** Muhammad Ahmad (23i-3083) and Murtaza Hassan (25i2603)
- **Status:** Accepted (15 November 2026)
