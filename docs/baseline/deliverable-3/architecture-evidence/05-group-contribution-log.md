# 05 — Group Contribution Log

**Course:** Software Engineering (Section SE-B)  
**Deliverable:** Deliverable 3 — Architectural Context for AI-Assisted Development  
**Project:** Human-Controlled Digital-Asset Advisory Application  
**Date:** 15 November 2026  

---

## 1. Group Members & Academic Roles

| Student Name | Roll Number | Section | Assigned Focus Areas |
|---|---|---|---|
| **Muhammad Ahmad** | 23i-3083 | SE-B | ASR Identification Lead, ADR-001 (Style), ADR-003 (Data Persistence), AGENTS.md Security & Constraints |
| **Murtaza Hassan** | 25i2603 | SE-B | ADR-002 (Boundaries), ADR-004 (Auth Boundary), ADR-005 (Integrations), architecture.md Consolidator, AI Experiment Lead |

---

## 2. Activity Breakdown and Contribution Matrix

| Deliverable 3 Activity | Primary Member | Supporting Member | Decisions Contributed To | Verification Evidence |
|---|---|---|---|---|
| **Stage 1: Source Document Analysis** | Muhammad Ahmad | Murtaza Hassan | Validated PRD baseline (FR-01 to FR-14, NFRs, BRs, C-01 to C-06); incorporated TA-provided requirements (FR-15 to FR-17); confirmed 6 OQs open. | `Stage 1 Report`, `Final PRD.md` cross-checks |
| **Stage 2: Task 1 — ASR & Driver Identification** | Muhammad Ahmad | Murtaza Hassan | Identified 13 ASRs (10 baseline + 3 TA-provided); formulated Non-ASR exclusions; derived 12 cross-cutting constraints. | `01-asr-identification.md` |
| **Stage 3: Task 2 — Major Architectural Decisions** | Both Members | Both Members | Evaluated alternatives and trade-offs for D-01 through D-05 (Style, Modules, Data, Auth, Integrations). | `02-architectural-decisions.md` |
| **Stage 4: Task 3 — Authoring ADR-001 (Style)** | Muhammad Ahmad | Murtaza Hassan | Modular Monolith with Ports & Adapters selection vs Microservices and Serverless. | `ADR/ADR-001-architecture-style.md` |
| **Stage 4: Task 3 — Authoring ADR-002 (Boundaries)** | Murtaza Hassan | Muhammad Ahmad | 8-module core (+ 3 TA-provided additions) partitioning; strict dependency isolation. | `ADR/ADR-002-component-boundaries.md` |
| **Stage 4: Task 3 — Authoring ADR-003 (Persistence)** | Muhammad Ahmad | Murtaza Hassan | Shared relational database with enforced logical ownership; append-only ledger rule. | `ADR/ADR-003-data-persistence.md` |
| **Stage 4: Task 3 — Authoring ADR-004 (Auth Boundary)** | Murtaza Hassan | Muhammad Ahmad | 4-stage structural separation; ephemeral device-signed grant tokens (<60s TTL). | `ADR/ADR-004-authentication-authorization.md` |
| **Stage 4: Task 3 — Authoring ADR-005 (Integrations)** | Murtaza Hassan | Muhammad Ahmad | Abstracted ports for exchange APIs; Transactional Outbox for WhatsApp/Push 10s SLA. | `ADR/ADR-005-external-integrations.md` |
| **Stage 5: Task 4 — architecture.md Authoring** | Murtaza Hassan | Muhammad Ahmad | Compiled all 30 mandatory sections, 4 Mermaid diagrams, traceability matrix. | `architecture.md`, `diagrams/*.mmd` |
| **Stage 6: Task 5 — AGENTS.md Authoring** | Muhammad Ahmad | Murtaza Hassan | Established agent operational constraints, import barriers, forbidden actions, test criteria. | `AGENTS.md` |
| **Stage 7 & 8: Tasks 6 & 7 — AI Validation & Critique** | Both Members | Both Members | Executed AI scaffolding prompt; identified Redis and shared DB boundary violations. | `03-ai-structure-evaluation.md` |
| **Stage 9: Task 8 — Architectural Refinement** | Both Members | Both Members | Refined `AGENTS.md`, `ADR-002`, `ADR-003`; re-tested AI agent to confirm clean structure. | `04-architecture-refinement-log.md` |

---

## 3. Team Understanding and Oral Defense Readiness

Both members actively collaborated in defining the architecture and are thoroughly prepared to defend every aspect during the oral demonstration:

- **Muhammad Ahmad (23i-3083):** Prepared to defend the ASR filtering rationale, the selection of the Modular Monolith style over Microservices, the real-time circuit breaker latency math, and the `AGENTS.md` constraint hierarchy.
- **Murtaza Hassan (25i2603):** Prepared to defend the 4-stage authorization boundary, the zero-withdrawal handshake mechanics, the durable 24-hour state machine resilience, and the evaluation/refinement findings from the AI experiment.

**Team Signatures:**
- *Muhammad Ahmad (23i-3083)* — Confirmed & Approved
- *Murtaza Hassan (25i2603)* — Confirmed & Approved
