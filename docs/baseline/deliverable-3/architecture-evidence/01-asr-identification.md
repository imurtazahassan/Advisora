# 01 — Architecturally Significant Requirements (ASR) Identification

**Project:** Human-Controlled Digital-Asset Advisory Application
**Deliverable:** Deliverable 3 — Architectural Context for AI-Assisted Development
**Team:** Muhammad Ahmad (23i-3083) · Murtaza Hassan (25i2603) · Section SE-B
**Status:** Approved by team — 15 November 2026
**Source documents used:** Final PRD.md · PRD_Critique_and_Human_Validation_Log.docx

---

## 1. Classification Methodology

A requirement was classified as an ASR only if it satisfied at least one of the following criteria:

1. **Structural forcing function** — It requires a specific component, boundary, or communication mechanism to exist.
2. **Cross-cutting scope** — It affects more than one module and cannot be isolated inside a single function.
3. **Non-local failure risk** — Getting it wrong causes cascading failures across the system.
4. **Quality-attribute tension** — It imposes a performance, security, reliability, or timing constraint that restricts design choices.

Requirements that failed all four criteria are listed in the Non-ASR exclusion table with explicit justification. No requirement is classified in both tables.

---

## 2. Approved ASR Table — Baseline (FR-01 to FR-14, NFRs, BRs, Constraints)

---

### ASR-01 — Per-Tranche Human Trade Authorization

| Field | Detail |
|---|---|
| **ASR ID** | ASR-01 |
| **Source Requirements** | FR-06, FR-07, BR-03, NFR-02, C-01 |
| **Human Validation Log** | HV-06, HV-07 |
| **Requirement Description** | Every individual tranche order requires separate PIN or biometric authorization. Plan approval does not authorize any trade. Authorization verification must complete within the one-minute authorization window. If verification does not complete within the window, the tranche is permanently skipped — it is never executed later. |
| **Why Architecturally Significant** | This is the primary safety constraint of the system. It directly prohibits autonomous execution and forces a structural separation between three distinct activities that must not be merged: (1) plan approval, (2) tranche scheduling, and (3) trade authorization and execution. The one-minute hard cutoff on a human-interactive flow introduces a real-time timing constraint that shapes the entire authorization pipeline. |
| **Architectural Concern** | There must be a strict, enforceable boundary between plan approval, tranche scheduling, and trade authorization. The one-minute window must be tracked using a server-side trusted clock and a persisted expiry timestamp. The expiry check must be atomic with the final authorization decision. The system must handle the race condition in which biometric processing completes after the window has closed — the authorization must still be rejected. |
| **Architectural Implications** | • A Trade Authorization component must exist independently of Plan Scheduling.<br>• Plan approval must produce zero trade-related side effects.<br>• Authorization state must be persisted with a server-generated expiry timestamp.<br>• The expiry check and the trade submission decision must be atomic.<br>• Duplicate submissions for the same tranche must not produce duplicate orders (FR-07 edge case). |
| **Priority** | Critical |
| **Affected Components** | Plan Management · Tranche Scheduling · Trade Authorization · Trade Execution · Exchange Integration |

---

### ASR-02 — Advisory Signal Validity: Three Distinct Rules

| Field | Detail |
|---|---|
| **ASR ID** | ASR-02 |
| **Source Requirements** | FR-04 (AC-04.1 through AC-04.4), FR-07, BR-04, BR-05, NFR-01 |
| **Human Validation Log** | HV-02, HV-03 |
| **Requirement Description** | Three separate rules govern signal and authorization validity. **(a) Signal expiry:** Each advisory signal expires exactly one minute after generation (FR-04 AC-04.1, BR-04). **(b) Price-shift invalidation:** A price increase **strictly greater than** 2.0% between signal generation and the authorization attempt invalidates the signal and locks the Buy button (FR-04 AC-04.2, BR-05). Exactly 2.0% does not trigger (FR-04 AC-04.3). **(c) Authorization window cutoff:** Verification must complete within the one-minute window; if the response arrives after the window closes, the tranche is permanently skipped (FR-07). All three rules must be evaluated at the moment of authorization, not only at notification creation time (FR-04 edge cases). |
| **Why Architecturally Significant** | Signal validity is not a single timestamp check. The price-shift rule requires comparing a live market price at authorization time against the entry price at signal generation time — it forces the trade authorization path to actively consult market data. All three conditions must be evaluated atomically as part of the authorization decision. |
| **Architectural Concern** | The final authorization gate must re-evaluate: (1) signal age against a server-side trusted clock, (2) current market price against the signal's stored entry price using strict greater-than, and (3) whether the authorization window is still open. All three checks must occur within the authorization transaction. A signal invalidated by any rule must be permanently unusable. |
| **Architectural Implications** | • Advisory signals must carry a server-generated creation timestamp and entry price, stored persistently.<br>• The authorization gate must retrieve current price from Market Data at authorization time.<br>• Price comparison must implement strict greater-than (`> 2.0%`), never `>= 2.0%`.<br>• A signal invalidated by any rule is permanently closed — no reuse.<br>• Duplicate signal delivery must not create duplicate authorization opportunities (FR-07 edge case).<br>• Validity must be re-checked at authorization time, not only at dispatch time (FR-04 edge cases). |
| **Priority** | Critical |
| **Affected Components** | Advisory Signal Generation · Signal Validation · Market Data Ingestion · Trade Authorization |

---

### ASR-03 — Real-Time Market Data Ingestion and Latency Safety Circuit Breaker

| Field | Detail |
|---|---|
| **ASR ID** | ASR-03 |
| **Source Requirements** | FR-04, Resolved OQ-03 (confirmed requirement), NFR-01 |
| **Human Validation Log** | HV-11 |
| **Requirement Description** | The connected exchange's real-time WebSocket ticker stream is the primary market price reference (Resolved OQ-03). During an active authorization window, if ticker latency exceeds 5 seconds OR market data is older than 15 seconds, the Buy button must be locked and "Market Data Unavailable" must be displayed. No order may be authorized while either condition applies. |
| **Why Architecturally Significant** | This requires a continuously running, stateful data ingestion component. On-demand REST polling at authorization time cannot reliably detect a feed that has silently stopped sending ticks, and a request taking several seconds would consume part of the 60-second window. Market data health must be immediately accessible to the authorization pipeline without an additional network round-trip. |
| **Architectural Concern** | A persistent WebSocket connection must be maintained and its health continuously monitored per asset. Two conditions must be tracked: (1) the interval since the last received tick, and (2) the timestamp within the most recent tick. The health state must be accessible in-process to the authorization pipeline. Recovery behavior and broader exchange outage handling beyond the lockout rule are open (OQ-04). |
| **Architectural Implications** | • A dedicated Market Data Ingestion component is required.<br>• It must maintain a persistent, reconnecting WebSocket connection.<br>• It must track tick arrival time and in-tick exchange timestamp per asset.<br>• Health state must be accessible to Trade Authorization without an additional network call.<br>• Recovery behavior and exchange outage handling beyond the latency/staleness lockout are not yet decided (OQ-04 — keep open). |
| **Priority** | Critical |
| **Affected Components** | Market Data Ingestion · Signal Validation · Trade Authorization |

---

### ASR-04 — High-Volatility Detection and Buy-Signal Suppression

| Field | Detail |
|---|---|
| **ASR ID** | ASR-04 |
| **Source Requirements** | FR-01 (AC-01.2), FR-12 (AC-12.1 through AC-12.5), BR-07 |
| **Human Validation Log** | HV-04 |
| **Requirement Description** | If an asset's price moves **strictly greater than** 5% upward or downward within a rolling one-hour window, the system must: (a) suppress new buy signals for that asset (FR-12 AC-12.1–12.3, BR-07), (b) display a Market Volatility Warning until movement settles below the threshold (FR-12 AC-12.4), and (c) if an advisory signal is active at the time the high-volatility condition triggers, immediately invalidate that signal, lock the Buy button, and display the Market Volatility Warning (FR-12 AC-12.5). Exactly 5% does not trigger (FR-12 edge cases). The rolling-window calculation method, baseline price reference, and reset/hysteresis logic are not yet specified — these remain open implementation details (PRD_Critique Section 4). |
| **Why Architecturally Significant** | This requires a continuously running, per-asset time-series evaluation process. When the threshold is crossed, the system must react immediately — suppressing future signals and invalidating any currently active signal (per FR-12 AC-12.5). This event crosses component boundaries between Market Data / Volatility Monitoring and Advisory Signal management. The unspecified rolling-window and reset logic are open details that must be resolved before the monitoring logic can be fully specified. |
| **Architectural Concern** | An ongoing sliding-window price movement monitor per eligible asset is required. When triggered, it must propagate to: (1) prevent new signal generation for that asset, and (2) immediately invalidate any currently active signal for that asset per FR-12 AC-12.5. The rolling-window definition, baseline price, and reset condition remain open and must not be assumed. |
| **Architectural Implications** | • A Volatility Monitoring process must maintain rolling per-asset price history covering the one-hour window.<br>• It must signal the high-volatility state to Advisory Signal Generation to suppress new signals.<br>• Per FR-12 AC-12.5, any active signal for the affected asset must be immediately invalidated when triggered.<br>• Strict greater-than semantics must be enforced (`> 5%`).<br>• Rolling-window definition, baseline price, and reset/clear condition are open and must not be assumed. |
| **Priority** | Critical |
| **Affected Components** | Market Data Ingestion · Volatility Monitoring · Advisory Signal Generation · Signal Validation |

---

### ASR-05 — Multi-Day Investment Plan Lifecycle and Tranche State Machine

| Field | Detail |
|---|---|
| **ASR ID** | ASR-05 |
| **Source Requirements** | FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, BR-01, BR-02, BR-06, BR-09, BR-10, C-05 |
| **Human Validation Log** | HV-05, HV-07, HV-08 |
| **Requirement Description** | Each plan spans up to 48+ hours with three tranches 24 hours apart. Plans can be Paused, Cancelled, Restarted, or Adjusted at any time, including while an authorization prompt is open. **Pause/Cancel race condition (confirmed — HV-08, FR-10 AC-10.3):** If an order has already been verified and submitted to the exchange before pause or cancel takes effect, that submitted order may complete; only subsequent unexecuted tranches are paused or cancelled. An authorization prompt still open to the user must be immediately revoked when the plan is paused or cancelled. Executed tranches are never modified. Resuming must not trigger missed intervals retroactively or immediately (BR-10, HV-08). |
| **Why Architecturally Significant** | This introduces a complex, multi-day stateful process that must survive server restarts without data loss, missed executions, or duplicate orders. The state machine must distinguish clearly between: (a) an authorization prompt open to the user (revocable), and (b) an order already submitted to the exchange (not recallable by the application). |
| **Architectural Concern** | A formal, durably persisted state machine for plans and tranches is required. It must distinguish at minimum: a tranche whose window is open (revocable) versus a tranche whose order is submitted (not recallable). Revocation of an open prompt must be atomic. The 24-hour scheduling must survive restarts. Concurrency between user actions and scheduled events must be controlled. |
| **Architectural Implications** | • Plan and tranche states must be persisted in durable storage — ephemeral in-memory timers are insufficient.<br>• A defined state machine must govern all legal transitions.<br>• The 24-hour scheduler must be durable-storage-backed to survive restarts.<br>• Concurrency control must protect state transitions against race conditions.<br>• The state machine must distinguish open prompt (revocable) from submitted order (not recallable).<br>• Resume calculates next tranche time from resume point forward — not backfilled (BR-10, HV-08; exact details partially open — OQ-05).<br>• Executed tranche records are append-only (XC-03). |
| **Priority** | Critical |
| **Affected Components** | Plan Management · Tranche Scheduling · Trade Authorization · Trade Execution · Portfolio / Execution Ledger |

---

### ASR-06 — Exchange API Key Security and Zero-Withdrawal Enforcement

| Field | Detail |
|---|---|
| **ASR ID** | ASR-06 |
| **Source Requirements** | FR-14 (AC-14.1 through AC-14.4), BR-11, NFR-02 |
| **Human Validation Log** | HV-10 |
| **Requirement Description** | Exchange API keys must be verified to have read and trade permissions and no withdrawal permissions, by querying the exchange's permission API before the key is accepted or stored. If withdrawal permissions cannot be confirmed as absent, the key must remain inactive (FR-14 AC-14.4). No withdrawal or transfer functionality may exist anywhere in the application. |
| **Why Architecturally Significant** | Credential management for financial exchange access carries severe risk. The ingestion path must include a live external verification step before storage. The exchange integration codebase must not contain any pathway that could initiate withdrawals — this is a structural constraint on what the exchange integration component is ever permitted to do. |
| **Architectural Concern** | A clearly isolated, secure Credential Management boundary is required. It must: (a) perform permission verification before key activation, (b) protect credentials from other system components, (c) expose only operations the application is permitted to perform, and (d) contain no withdrawal or transfer operations. |
| **Architectural Implications** | • Exchange API key storage must be isolated from general application data.<br>• Credentials must be protected at rest — specific protection mechanism is a team decision.<br>• Permission verification must be executed against the exchange before key activation.<br>• If verification fails or cannot be completed, the key remains inactive (FR-14 AC-14.4).<br>• The exchange adapter must only expose: read balance, subscribe to market data, place spot market buy order.<br>• No withdrawal, transfer, or movement-of-funds methods may appear anywhere in the codebase. |
| **Priority** | Critical |
| **Affected Components** | Credential Management · Exchange Integration · Trade Execution |

---

### ASR-07 — Asynchronous Multi-Channel Notification Delivery with Delivery SLA

| Field | Detail |
|---|---|
| **ASR ID** | ASR-07 |
| **Source Requirements** | FR-02 (AC-02.1, AC-02.3), NFR-04, C-04 |
| **Human Validation Log** | HV-15 |
| **Requirement Description** | Advisory signals and tranche prompts must be dispatched across WhatsApp and mobile push notification channels. At least 95% of notifications must achieve provider acceptance within 10 seconds, measured over 1,000 dispatches (NFR-04). Notification dispatch must not consume the one-minute signal validity window through continuous retries (FR-02 edge cases). Provider acceptance must not be misrepresented as confirmed end-device receipt (FR-02 AC-02.3, HV-15). If one channel fails, the other must proceed independently (FR-02 edge cases). |
| **Why Architecturally Significant** | Synchronous dispatch inside the signal generation or authorization request path would endanger the 60-second signal window if the external provider is slow or unavailable. The 95%/10-second SLA, the prohibition on retries that consume the validity window, and the requirement to track provider acceptance per channel all point to a decoupled delivery mechanism operating independently of the core transaction path. |
| **Architectural Concern** | Notification dispatch must not block the signal generation or authorization flow. Provider acceptance must be tracked per channel per dispatch. Retries must not consume the signal validity window — the specific retry policy is an implementation detail to be decided in the team's architectural decisions, not assumed here. Duplicate notifications must not create duplicate authorization opportunities. |
| **Architectural Implications** | • Notifications must not be dispatched synchronously within the signal generation transaction.<br>• A decoupled notification dispatch mechanism is required — specific pattern is a team decision for Task 2.<br>• Provider acceptance timestamp must be recorded per channel per dispatch.<br>• If one channel fails, the other must proceed independently.<br>• Duplicate notifications must not create duplicate authorization opportunities.<br>• Retry behaviour must not consume the signal validity window — specific retry policy not prescribed here. |
| **Priority** | High |
| **Affected Components** | Notification Management · Advisory Signal Generation · Plan Scheduling |

---

### ASR-08 — User Authentication, Biometric Authorization, and PIN Recovery Boundary

| Field | Detail |
|---|---|
| **ASR ID** | ASR-08 |
| **Source Requirements** | NFR-02, Resolved OQ-06 |
| **Human Validation Log** | HV-14 |
| **Requirement Description** | Per-tranche authorization uses native device OS biometrics (Face ID/Touch ID) or PIN (Resolved OQ-06). PIN recovery requires two-factor OTP verification sent to the registered phone or email. OTP lifecycle, attempt limits, rate limits, and device-change handling remain open implementation details (HV-14). |
| **Why Architecturally Significant** | Authentication for financial authorization spans the boundary between the user's device and the server. Native OS biometrics are executed on the device by the device OS — the server cannot independently re-execute or directly verify the biometric result. This creates a **device/server trust boundary** that is an unresolved architectural concern: the architecture must define what signal the device provides, how the server validates it, and what prevents a malicious client from fabricating a successful biometric claim. The specific mechanism is a decision for Task 2. The OTP recovery path is a sensitive secondary authentication flow with its own security surface. |
| **Architectural Concern** | The device/server trust boundary for biometric authorization must be explicitly designed in Task 2. Additionally, the OTP recovery path must be designed as a security-critical flow that does not bypass the authorization boundary. OTP lifecycle controls are open (HV-14). |
| **Architectural Implications** | • A distinct User Authentication component must handle login, PIN management, and OTP recovery separately from Trade Authorization.<br>• The device/server trust model for biometric authorization is an open architectural decision — to be resolved in Task 2 by the team.<br>• PIN recovery must route through a 2FA OTP flow — it must not bypass trade authorization.<br>• OTP delivery depends on an external provider — an integration boundary is required.<br>• OTP lifecycle controls are open implementation details (HV-14) — not assumed here. |
| **Priority** | High |
| **Affected Components** | User Authentication · Trade Authorization · Notification Management (OTP delivery) |

---

### ASR-09 — Rolling 30-Day Signal Accuracy Calculation

| Field | Detail |
|---|---|
| **ASR ID** | ASR-09 |
| **Source Requirements** | FR-13 (AC-13.1 through AC-13.5), BR-08, NFR-01 |
| **Human Validation Log** | HV-09 |
| **Requirement Description** | Signal Accuracy is the percentage of advisory signals in the past 30 days that reached their target profit yield without the asset dropping more than 3% from entry price. A decline **strictly greater than** 3% from entry marks a signal as unsuccessful (FR-13 AC-13.3). The 3% loss limit is a scoring criterion only — it must not trigger any operational action (HV-09, HV-17). Results must be presented as historical performance, not a guarantee (FR-13 AC-13.5). Display details remain partially open (OQ-08). |
| **Why Architecturally Significant** | Signal Accuracy requires tracking post-generation price behaviour of recommended assets over a rolling 30-day period — this is an ongoing background process, not a one-time calculation. The process must access sufficient historical price information. It must be clearly separated from the trade authorization path to prevent misuse as an operational stop-loss. |
| **Architectural Concern** | A Signal Performance Analytics component must track outcomes of historical signals against post-generation price movements. It must enforce strictly-greater-than on the 3% threshold. It must produce no operational side effects. It must access sufficient historical price information — how that information is stored and retained is an implementation decision for Task 2. |
| **Architectural Implications** | • A Signal Performance Analytics component must exist, separate from the trade authorization path.<br>• It must access signal records (entry price, target yield, generation time) and historical price data per asset.<br>• The 3% breach marks a signal unsuccessful only — no trading action triggered.<br>• Display must include historical-performance disclaimer (FR-13 AC-13.5).<br>• Sufficient historical price data must be retained for 30-day lookback — storage mechanism is a team decision.<br>• Display details and exact calculation semantics are partially open (OQ-08). |
| **Priority** | Medium |
| **Affected Components** | Advisory Signal Generation · Signal Performance Analytics · Market Data Ingestion |

---

### ASR-10 — Conservative Asset Eligibility Determination

| Field | Detail |
|---|---|
| **ASR ID** | ASR-10 |
| **Source Requirements** | FR-01 (AC-01.3 and edge cases), BR-12, Resolved asset eligibility decision |
| **Human Validation Log** | HV-12 |
| **Requirement Description** | Advisory recommendations are restricted to Bitcoin, Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, subject to conservative high-liquidity criteria. High-risk altcoins and illiquid tokens are excluded (BR-12). The ranking data source, measurement timestamp, objective eligibility criteria, and exclusion definitions are unresolved implementation details (HV-12, PRD Section 10 implementation note). |
| **Why Architecturally Significant** | Signal generation must check asset eligibility before producing a recommendation. Because the top-10 ranking changes over time, eligibility cannot be treated as a permanently static list. The unresolved ranking source, refresh frequency, and objective criteria mean the architecture must not encode a specific data provider or refresh mechanism at this stage. |
| **Architectural Concern** | Signal Generation must consult an asset eligibility determination before producing any recommendation. The dependency on a ranking source whose nature is unspecified means the architecture must not encode a specific data provider or refresh mechanism until the ranking source is confirmed. |
| **Architectural Implications** | • Signal Generation must consult asset eligibility before producing any recommendation.<br>• Asset eligibility must be a consultable component or function accessible to Signal Generation.<br>• Ranking data source, measurement timestamp, and refresh frequency are unresolved — must not be assumed.<br>• The specific implementation is a decision to be made when the ranking source is confirmed.<br>• BTC and ETH are confirmed as eligible by name in the resolved eligibility decision. |
| **Priority** | Medium |
| **Affected Components** | Advisory Signal Generation · Asset Eligibility |

---

## 3. ASR Table — TA-Provided Additional Requirements (FR-15 to FR-17)

> ⚠️ **Status: TA-Provided Additional Requirements (Deliverable 2 Demonstration). Must not modify or trigger any core trading, authorization, or signal workflow.**

---

### ASR-11 — Personal Digital-Asset Watchlist *(TA-Provided — FR-15)*

| Field | Detail |
|---|---|
| **ASR ID** | ASR-11 |
| **Source Requirements** | FR-15 (TA-Provided) |
| **Status** | TA-Provided Additional Requirement |
| **Requirement Description** | Users may add or remove eligible assets from a personal watchlist. The watchlist displays latest price, 24-hour price change, and market-data update time per watchlisted asset. The watchlist must not automatically generate trade orders or modify existing investment plans. |
| **Why Architecturally Significant (If Confirmed)** | The watchlist is user-editable and requires real-time or near-real-time market data for assets that may have no active advisory signal or plan. The critical architectural constraint is isolation: the watchlist must have no path that can trigger, modify, or influence any trading, signal generation, or plan management operation. |
| **Architectural Concern** | The Watchlist component manages a user-editable list (users add and remove entries). It consumes market data for display. Its dependency direction must run strictly inbound from Market Data — no path to Plan Management, Signal Generation, Trade Authorization, or Trade Execution. |
| **Architectural Implications** | • Watchlist stores user-managed asset entries — editable by the user (add/remove).<br>• Watchlist display consumes market data — the Market Data component may need to cover watchlisted assets beyond active plans.<br>• No write path from Watchlist to plans, signals, authorization, or execution components.<br>• Watchlist data is stored separately from plan and signal data.<br>• Market data consumption must be isolated from trading workflows. |
| **Priority** | Medium (if confirmed) |
| **Affected Components** | Watchlist Management · Market Data Ingestion |

---

### ASR-12 — Executed Trade History and CSV Export *(TA-Provided — FR-16)*

| Field | Detail |
|---|---|
| **ASR ID** | ASR-12 |
| **Source Requirements** | FR-16 (TA-Provided) |
| **Status** | TA-Provided Additional Requirement |
| **Requirement Description** | Users may view and export confirmed executed trades as a CSV file for a user-selected date range. Each record includes asset name, execution date/time, quantity, execution price, total transaction amount, and associated plan ID. This feature is strictly read-only against confirmed executed trade records — it must not modify portfolio or execution records. |
| **Why Architecturally Significant (If Confirmed)** | The execution ledger is append-only under XC-03. Any query or export pathway that could modify ledger records would violate this constraint. The architectural concern is ensuring that the Trade History access path is structurally read-only — not merely by convention. |
| **Architectural Concern** | Trade History must access confirmed execution records read-only. The boundary between this read access path and the write path that appends execution records must be explicit and enforced. No update or delete operations may flow from Trade History toward the execution ledger. |
| **Architectural Implications** | • Trade History has read-only access to the execution ledger.<br>• No update or delete operations are permitted from this access path.<br>• CSV generation is a formatting concern with no business logic side effects.<br>• Date-range filtering requires access to execution timestamps. |
| **Priority** | Low (if confirmed) |
| **Affected Components** | Trade History · Portfolio / Execution Ledger |

---

### ASR-13 — Private Investment Decision Journal *(TA-Provided — FR-17)*

| Field | Detail |
|---|---|
| **ASR ID** | ASR-13 |
| **Source Requirements** | FR-17 (TA-Provided) |
| **Status** | TA-Provided Additional Requirement |
| **Requirement Description** | Users may add, edit, and delete personal notes associated with individual advisory signals or investment plans. Each note contains a title, written explanation, and creation date. Notes must remain private. The journal must not affect trade authorization, signal validity, or investment execution in any way. |
| **Why Architecturally Significant (If Confirmed)** | The journal's note management uses full CRUD operations (add, edit, delete) on its own data. The architecturally significant constraint is isolation: the journal must not introduce any dependency — direct or indirect — toward trade authorization, signal validation, plan management, or trade execution. References to signals and plans are identifiers for display context only. |
| **Architectural Concern** | The journal component manages its own note data. Its isolation means it must not write to, trigger, or influence any financial component. References to signals and plans are foreign-key identifiers for display only — not shared mutable objects. |
| **Architectural Implications** | • Journal manages its own note data with add, edit, and delete operations on notes.<br>• References to signals or plans are identifiers for display only — no shared business logic.<br>• No dependency from Journal toward Trade Authorization, Signal Validation, Plan Management, or Trade Execution.<br>• Journal data is stored in its own isolated area, separate from financially significant records. |
| **Priority** | Low (if confirmed) |
| **Affected Components** | Investment Journal |

---

## 4. Non-ASR Exclusion Table

| Requirement | Classification | Justification |
|---|---|---|
| **FR-02 (AC-02.2) — Consistent notification content across channels** | Non-ASR | Content consistency between WhatsApp and push payloads is a formatting requirement within Notification Management. The structurally significant aspects of FR-02 — decoupled delivery, channel integration, and delivery tracking — are captured in ASR-07. This sub-requirement does not add a new component or boundary. |
| **FR-03 — Bilingual English/Urdu text with Urdu translation fallback** | Non-ASR | Bilingual content is part of the signal payload and formatted by the Notification component. The fallback behaviour (dispatch English with approved fallback text if Urdu translation fails) is a formatting rule within the notification pipeline. It does not require a separate component, force a new boundary, or impose a quality-attribute constraint affecting multiple systems. No external translation service is specified in the PRD. The fallback rule is captured as XC-09. |
| **FR-05 (5% cap arithmetic and three-tranche rounding)** | Non-ASR | Arithmetic validation and rounding logic are localised within Plan Management. No new component or quality-attribute constraint is introduced. The plan lifecycle and scheduling that FR-05 enables are captured in ASR-05. |
| **FR-11 (restart arithmetic — recalculate from current balance and market conditions)** | Non-ASR | Business logic within Plan Management governing how a restarted plan is initialised. No new component boundary is required. The lifecycle state machine is captured in ASR-05. |
| **BR-12 (exclusion of high-risk altcoins and illiquid tokens)** | Non-ASR | The exclusion rule is a filtering criterion applied within the Asset Eligibility component established by ASR-10. BR-12 itself does not force a new component or boundary — it is a business rule within the scope already defined by ASR-10. |
| **C-02 — Target users are non-technical savers** | Non-ASR | A product scope and user research constraint. Affects UX copy and explanation style. Does not impose a structural boundary or quality-attribute requirement. |
| **C-06 — No profit guarantee** | Non-ASR | A product scope constraint expressed through disclaimers in UI and notification content. Does not impose a structural boundary. |
| **FR-13 AC-13.5 — Signal Accuracy must be presented as historical performance** | Non-ASR | A presentation and disclaimer requirement within the Signal Performance Analytics component established by ASR-09. Does not force a new component boundary. |

---

## 5. Cross-Cutting Architectural Constraints

| ID | Constraint | Source | Scope |
|---|---|---|---|
| **XC-01** | **Strict Greater-Than Semantics.** All threshold comparisons use strict greater-than (`>`). Exactly 2.0% price shift does not trigger invalidation. Exactly 5% volatility does not trigger suppression. Exactly 3% decline does not breach the Signal Accuracy loss limit. | FR-04 AC-04.3; FR-12 edge cases; FR-13 AC-13.3; HV-03, HV-04, HV-09 | All components that evaluate price thresholds. Must be explicitly tested. |
| **XC-02** | **No Autonomous Trade Execution.** The system must never submit a trade order without a valid, current, human-generated authorization for that specific tranche. No scheduled event, plan approval, or system process may trigger order submission without passing through the Trade Authorization boundary. | C-01, BR-03, NFR-02; HV-06 | Tranche Scheduling → Trade Authorization → Trade Execution dependency chain. |
| **XC-03** | **Append-Only Execution Ledger.** Confirmed executed tranche records may never be updated or deleted by any system component. | BR-09; HV-08 | Portfolio / Execution Ledger. Enforced at the data access boundary. |
| **XC-04** | **Zero Withdrawal Capability.** No code, endpoint, data model, or integration method for fund withdrawal or external transfer may exist anywhere in the system. | FR-14, BR-11; HV-10 | Exchange Integration adapter and all components that interact with it. |
| **XC-05** | **Server-Side Authorization Cutoff.** The one-minute authorization window expiry must be enforced by the server using a server-generated and server-verified timestamp. Client-side timing must not be relied upon for the final authorization decision. | FR-07, NFR-01; HV-02, HV-07 | Trade Authorization component. |
| **XC-06** | **Buy Authorization Must Be Blocked on Market Data Failure.** When ticker latency exceeds 5 seconds OR market data is older than 15 seconds during an active authorization window, the Buy action must be blocked and "Market Data Unavailable" displayed. No order may be authorized under either condition. | FR-04, Resolved OQ-03; HV-11 | Market Data Ingestion, Trade Authorization. |
| **XC-07** | **Non-Retroactive Plan Resumption.** Resuming a paused plan must never trigger missed tranches retroactively or immediately. The next remaining tranche must be scheduled from the resume point forward. | BR-10; HV-08; OQ-05 (partially open) | Tranche Scheduling, Plan Management. |
| **XC-08** | **Open Questions Must Not Be Silently Resolved.** OQ-01, OQ-04, OQ-05, OQ-07, OQ-08, and OQ-09 remain open. The architecture must not encode assumptions about their resolution. | PRD Section 10 | All components. |
| **XC-09** | **Urdu Translation Failure Must Not Delay or Cancel Dispatch.** If Urdu translation fails or is unavailable, the signal must be dispatched with the English explanation and the approved fallback text: "Detailed Urdu explanation currently unavailable." The signal must not be delayed or cancelled as a result. | FR-03 AC-03.3, NFR-03 | Notification Management, Advisory Signal Generation. |
| **XC-10** | **Provider Acceptance Is Not Device Delivery.** Notification dispatch status may only report provider acceptance. It must not represent, imply, or be recorded as confirmed end-device receipt. | FR-02 AC-02.3, NFR-04; HV-15 | Notification Management. |
| **XC-11** | **Inactive Key on Unverifiable Withdrawal Permission.** If withdrawal permission status cannot be verified as absent, the API key must remain inactive. It must not be stored and treated as though it is safe. | FR-14 AC-14.4; HV-10 | Credential Management, Exchange Integration. |
| **XC-12** | **3% Loss Limit Is Measurement-Only.** A signal outcome breaching the 3% decline threshold marks that signal as unsuccessful in the Signal Accuracy calculation only. It must not trigger any operational action — no automatic stop-loss, no forced position closure, no trade submission. | BR-08, FR-13 AC-13.3; HV-09, HV-17 | Signal Performance Analytics. Must not couple to Trade Execution. |

---

## 6. Requirement-to-ASR Traceability Map

```
Final PRD — Approved Baseline
─────────────────────────────────────────────────────────────────────
FR-01, BR-12                               →  ASR-10 (Asset Eligibility)
                                           →  ASR-04 (Volatility suppression applies to Signal Generation)
FR-02 (AC-02.1, AC-02.3), NFR-04, C-04   →  ASR-07 (Async Notification Delivery)
FR-02 (AC-02.2)                           →  Non-ASR (content formatting); within Notification Mgmt
FR-03                                     →  Non-ASR (bilingual formatting); XC-09 (fallback constraint)
FR-04, BR-04, BR-05, NFR-01              →  ASR-02 (Signal Validity and Price-Shift Rules)
FR-04, Resolved OQ-03, NFR-01            →  ASR-03 (Market Data Ingestion and Circuit Breaker)
FR-05, C-05, BR-01, BR-02               →  ASR-05 (Plan Lifecycle); Non-ASR (arithmetic/rounding)
FR-06, FR-07, BR-03, NFR-02, C-01       →  ASR-01 (Per-Tranche Authorization)
FR-08, FR-09, FR-10, FR-11, BR-09, BR-10 →  ASR-05 (Plan Lifecycle State Machine)
FR-11                                    →  Non-ASR (restart arithmetic); within Plan Management
FR-12, BR-07                             →  ASR-04 (Volatility Monitoring and Suppression)
FR-13, BR-08, NFR-01                     →  ASR-09 (Signal Accuracy Analytics)
FR-14, BR-11, NFR-02                     →  ASR-06 (Exchange API Security)
NFR-02, Resolved OQ-06                   →  ASR-08 (Auth and Biometric Boundary)
C-02                                     →  Non-ASR (product scope, UX guidance)
C-06                                     →  Non-ASR (product scope, disclaimer copy)

Human Validation Log
────────────────────────────────────────────────────────────────────
HV-02, HV-07     →  ASR-02 (signal expiry); ASR-01 (auth window); XC-05
HV-03            →  ASR-02 (strict >2.0%); XC-01
HV-04            →  ASR-04 (strict >5%); XC-01
HV-05            →  ASR-05 (5% cap, three tranches)
HV-06, HV-07     →  ASR-01 (per-tranche auth)
HV-08            →  ASR-05 (pause/cancel race condition, non-retroactive resume); XC-03
HV-09, HV-17     →  ASR-09 (3% measurement only); XC-12
HV-10            →  ASR-06 (zero withdrawal); XC-04; XC-11
HV-11            →  ASR-03 (WebSocket, latency, staleness); XC-06
HV-12            →  ASR-10 (asset eligibility; ranking source open)
HV-14            →  ASR-08 (auth recovery; OTP details open)
HV-15            →  ASR-07; XC-10

TA-Provided Additional Requirements (FR-15 to FR-17)
────────────────────────────────────────────────────────────────────
FR-15 (TA-Provided)  →  ASR-11 (Watchlist; TA-Provided)
FR-16 (TA-Provided)  →  ASR-12 (Trade History; TA-Provided)
FR-17 (TA-Provided)  →  ASR-13 (Journal; TA-Provided)
```

---

## 7. Unresolved Issues Requiring Human Decisions

| # | Issue | Source | Decision Needed |
|---|---|---|---|
| **U-01** | Device/server trust boundary for biometric authorization | ASR-08, NFR-02, Resolved OQ-06 | How does the server validate that device-side biometric verification actually succeeded? What prevents fabrication? Must be decided in Task 2. |
| **U-02** | High-volatility rolling window definition and reset logic | ASR-04, FR-12, PRD_Critique Section 4 | The rolling-window calculation method, baseline price reference, and "settling below threshold" reset/hysteresis rule are not specified. Must be defined before monitoring logic can be fully specified. |
| **U-03** | Exchange outage handling beyond the latency/staleness lockout | ASR-03, OQ-04 | What happens when the exchange WebSocket is unavailable for an extended period? How does the system recover? Keep open — OQ-04. |
| **U-04** | Exact plan resumption scheduling details | ASR-05, OQ-05, BR-10 | The rule that missed intervals are not backfilled is confirmed. Precise calculation of next tranche time after resumption remains partially open — OQ-05. |
| **U-05** | Asset eligibility ranking source and refresh behaviour | ASR-10, HV-12, PRD Section 10 note | Authoritative source for global 24-hour spot volume rankings, measurement timestamp, and refresh frequency is not specified. Must not be assumed. |
| **U-06** | Signal Accuracy display and calculation edge cases | ASR-09, OQ-08 | Exact calculation semantics, display format, and historical record details are open — OQ-08. |
| **U-07** | OTP recovery security controls | ASR-08, HV-14 | OTP expiry, attempt limits, rate limits, device-change handling, and audit trail are open implementation details — HV-14. |
| **U-08** | Audio summaries scope | HV-16, OQ-07 | Not confirmed for first release. Must not be introduced without explicit team decision — OQ-07. |
| **U-09** | Exchange and technology stack selection | OQ-01 | Which exchange(s) the first release supports affects the integration adapter design. Keep open — OQ-01. |

### Note on TA-Provided Additional Requirements (FR-15, FR-16, FR-17)
Requirements FR-15 (Personal Digital-Asset Watchlist), FR-16 (Executed Trade History and CSV Export), and FR-17 (Private Investment Decision Journal) were provided directly by our Teaching Assistants (acting as clients) during the Deliverable 2 demonstration. They are confirmed as **TA-Provided Additional Requirements** and their functional requirements are formally documented in Section 12 of `PRD.md`. Their structural boundaries (strictly read-only access and complete isolation from trade execution) are established in ASR-11, ASR-12, and ASR-13. Consequently, their origin and inclusion are settled and not an unresolved issue.
