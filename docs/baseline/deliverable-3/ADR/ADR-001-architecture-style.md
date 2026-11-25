# ADR-001: Overall Architectural Style — Modular Monolith with Ports & Adapters

## Status
**Accepted**

## Date
15 November 2026

## Context
The Human-Controlled Digital-Asset Advisory Application must satisfy demanding, cross-cutting requirements:
1. Low-latency market safeguards (<5s ticker latency, <15s data staleness, >2.0% price shift lock).
2. Strict human-in-the-loop authorization with a 60-second real-time cutoff per tranche.
3. Multi-day stateful scheduling (3 tranches across 48+ hours) with immediate Pause/Cancel revocation.
4. Asynchronous decoupled notification dispatch across WhatsApp and Mobile Push gateways.
5. Absolute zero-withdrawal financial security and credential isolation.
6. A 2-person engineering team guiding an AI coding agent without distributed multi-service failure modes.

## Related ASRs
- **ASRs:** ASR-01, ASR-02, ASR-03, ASR-04, ASR-05, ASR-06, ASR-07, ASR-08
- **Constraints:** XC-01, XC-02, XC-03, XC-04, XC-05, XC-06

## Alternatives Considered

### Alternative 1: Traditional 3-Tier Layered Monolith (Presentation-Business-Data)
- **Description:** All features share horizontal layers (Controllers, Services, Repositories).
- **Pros:** Familiar, simple to setup.
- **Cons:** Fails to enforce domain encapsulation. Credential management, trade execution, and scheduling share the same layers, making it easy for an AI agent to bypass boundaries or leak direct database queries.

### Alternative 2: Distributed Microservices Architecture
- **Description:** Decomposing the system into distinct network services communicating over HTTP/gRPC and message brokers.
- **Pros:** Strong physical isolation for the credential vault; independent deployment.
- **Cons:** High operational overhead; inter-service network latency adds risk to the 5-second staleness check and 60-second window; distributed transactions (Saga pattern) needed for multi-tranche state; high risk of AI agent integration drift.

### Alternative 3: Event-Driven Serverless (Cloud Functions + Managed Queues)
- **Description:** Stateless ephemeral functions triggered by events.
- **Pros:** Auto-scaling, zero idle cost.
- **Cons:** Incompatible with persistent, stateful WebSocket ticker ingestion; cold starts (1–3s) threaten the 60s authorization window; difficult local testing.

### Alternative 4: Modular Monolith with Ports & Adapters (Hexagonal Architecture) (Selected)
- **Description:** A single deployable application partitioned into strictly isolated domain modules. Each module exposes explicit interfaces (ports) and interacts with external infrastructure via adapters. Internal events are dispatched via an in-process event bus.

## Decision
The team selects **Alternative 4: Modular Monolith with Ports & Adapters (Hexagonal Architecture)**.

## Rationale
- **Sub-Millisecond In-Memory Guards:** Checking price shift (>2.0%) and stream freshness (<5s) executes directly in memory in $<1$ ms, preserving the full 60s authorization window for the human user.
- **ACID Transaction Guarantees:** Multi-table updates (plan status, tranche state, notification outbox) occur within single database transactions, eliminating distributed split-brain states.
- **AI Agent Context Alignment:** The entire project resides in a single unified workspace. Module boundaries and import restrictions are enforceable via `AGENTS.md` and static linting.

## Trade-offs and Consequences
- **Benefits:** Maximum runtime performance, zero distributed operational drag, straightforward local testing and grading demo.
- **Limitations & Risks:** Logical boundaries can be bypassed if an AI coding agent ignores import rules.
- **Mitigation:** Strict dependency direction rules and explicit port interfaces mandated in `AGENTS.md`.

## Security Implications
Logical separation between credential handling and business logic is strictly enforced. No module can access credentials directly; operations must pass through the Credential Management port.

## Dependencies
Foundational decision. ADR-002, ADR-003, ADR-004, and ADR-005 build directly on this architectural style.

## Human Approval
- **Approved by:** Muhammad Ahmad (23i-3083) and Murtaza Hassan (25i2603)
- **Status:** Accepted (15 November 2026)
