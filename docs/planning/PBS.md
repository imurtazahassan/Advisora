# Product Breakdown Structure (PBS)

## Project
Human-Controlled Digital-Asset Advisory Application

## 1. User and Access Management
- User registration and authentication
- Session management
- Device registration and authorization
- Exchange credential management

## 2. Market Intelligence
- Market data ingestion
- Market data health monitoring
- Asset eligibility evaluation
- Volatility evaluation

## 3. Advisory System
- Advisory signal generation
- Signal validity and invalidation
- Risk explanations
- Historical signal accuracy

## 4. Investment Planning
- Capital allocation
- Investment plan creation
- Plan approval and management
- Three-tranche scheduling

## 5. Human Authorization
- Individual tranche authorization
- Authorization expiry
- Skipped tranche handling
- Pause, cancellation and restart controls

## 6. Trade Execution
- Authorized trade execution
- Execution status tracking
- Immutable execution records
- No autonomous trading
- No withdrawal or transfer capability

## 7. Communication
- User notifications
- Notification delivery tracking
- Bilingual explanations as specified by approved requirements

## 8. Supporting User Features
- Watchlist
- Trade history
- CSV export
- Investment journal

## 9. Quality and Operations
- Relational persistence
- Module boundaries
- Security controls
- Automated tests
- Integration tests
- Local deployment and execution
- Technical documentation

## Baseline
This PBS is a planning decomposition, not approval to change
the requirements or architecture in Deliverable 3.

Every leaf item must be traced to an approved requirement
or explicitly marked as supporting engineering work.

## Deliverable 4 Traceability Control

Every PBS leaf must be traceable to an approved FR, NFR, BR, constraint, ADR or explicitly identified supporting engineering activity. PBS decomposition does not authorize new product requirements or changes to approved architecture.

Supporting modules retain the boundaries defined in ADR-002: `watchlist`, `trade_history` and `investment_journal` remain separate modules.

## PBS Leaf-Level Traceability

The following table traces each PBS leaf to its approved requirement,
architecture decision or explicitly identified engineering activity.
References identify coverage; they do not create new requirements.

| PBS section and leaf | Traceability |
|---|---|
| User registration and authentication | ASR-08, NFR-02, ADR-004, VS-01 |
| Session management | ASR-08, NFR-02, ADR-004, VS-01 |
| Device registration and authorization | ASR-08, NFR-02, ADR-004, VS-01, VS-05 |
| Exchange credential management | FR-14, BR-11, C-03, ADR-003, ADR-005, VS-06 |
| Market data ingestion | FR-04, OQ-03, ADR-005, XC-06, VS-02 |
| Market data health monitoring | FR-04, NFR-01, XC-06, VS-02 |
| Asset eligibility evaluation | FR-01, BR-12, VS-02 |
| Volatility evaluation | FR-12, BR-07, VS-02, VS-03 |
| Advisory signal generation | FR-01, VS-03 |
| Signal validity and invalidation | FR-04, BR-04, BR-05, VS-02, VS-03 |
| Risk explanations | FR-03, NFR-03, C-02, VS-03 |
| Historical signal accuracy | FR-13, BR-08, XC-12, VS-08 |
| Capital allocation | FR-05, BR-01, BR-10, OQ-02, VS-04 |
| Investment plan creation | FR-05, BR-01, VS-04 |
| Plan approval and management | FR-05, FR-08, C-01, VS-04 |
| Three-tranche scheduling | FR-06, BR-02, C-05, VS-04, VS-05 |
| Individual tranche authorization | FR-06, BR-03, ADR-004, VS-05 |
| Authorization expiry | FR-06, FR-07, BR-06, ADR-004, VS-05 |
| Skipped tranche handling | FR-07, BR-06, OQ-05, VS-05 |
| Pause, cancellation and restart controls | FR-08, FR-09, FR-10, FR-11, BR-09, BR-10, OQ-05, VS-04, VS-05 |
| Authorized trade execution | FR-06, FR-14, BR-03, C-01, ADR-004, VS-06 |
| Execution status tracking | FR-16, ADR-003, VS-06, VS-08 |
| Immutable execution records | FR-16, ADR-003, XC-03, VS-06, VS-08 |
| No autonomous trading | C-01, XC-02, ADR-002, ADR-004, VS-05, VS-06 |
| No withdrawal or transfer capability | FR-14, BR-11, C-03, XC-04, XC-11, ADR-005, VS-06 |
| User notifications | FR-02, C-04, ADR-005, VS-07 |
| Notification delivery tracking | FR-02, NFR-04, C-04, XC-10, ADR-005, VS-07 |
| Bilingual explanations | FR-03, NFR-03, C-02, XC-09, VS-03, VS-07 |
| Watchlist | FR-15, ADR-002, VS-08 |
| Trade history | FR-16, ADR-002, ADR-003, VS-08 |
| CSV export | FR-16, ADR-002, VS-08 |
| Investment journal | FR-17, ADR-002, VS-08 |
| Relational persistence | ADR-003, ADR-001, VS-09 |
| Module boundaries | ADR-001, ADR-002, ADR-003, VS-09 |
| Security controls | ASR-08, NFR-02, ADR-003, ADR-004, ADR-005, VS-01, VS-06 |
| Automated tests | Supporting engineering activity; plan.md testing and verification controls, VS-09 |
| Integration tests | Supporting engineering activity; ADR-005 integration boundaries, VS-09 |
| Local deployment and execution | Supporting engineering activity; accepted technology stack, VS-09 |
| Technical documentation | Supporting engineering activity; Deliverable 4 documentation and evidence controls, VS-09 |

### Traceability Qualification

1. Supporting engineering activities are not additional product requirements.
2. ADR-003 table ownership remains authoritative; this PBS mapping does not create new database ownership.
3. `trade_history` remains read-only against the execution ledger.
4. `watchlist` and `investment_journal` remain isolated from execution workflows.
5. Any leaf whose implementation requires an unspecified behavior must wait for that behavior to be specified and reviewed.
