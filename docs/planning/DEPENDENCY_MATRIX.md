# Dependency Matrix

> Status: Reconciled with accepted decisions; implementation readiness validation pending.

| Slice | Depends on | Reason |
|---|---|---|
| VS-01 User Access and Device Security | Foundation and approved security decisions | Protected functionality requires identity and access controls. |
| VS-02 Market Data and Asset Eligibility | Foundation; relevant parts of VS-01 | Market data must be ingested, validated, and associated with application access rules. |
| VS-03 Advisory Signal Generation | VS-02 | Signals depend on valid market data and asset eligibility. |
| VS-04 Investment Plan Management | VS-01; approved planning rules | Plans require an authenticated user and approved allocation behavior. |
| VS-05 Tranche Scheduling and Human Authorization | VS-04; VS-01; relational database-backed scheduler | Tranches belong to plans, use fixed 24-hour intervals, require separate human authorization, expire after 60 seconds, and are permanently skipped when unauthorized. Accepted OQ-05 requires future eligible tranches only after resume; missed intervals are never backfilled. |
| VS-06 Authorized Trade Execution | VS-05; VS-02; approved exchange integration | Execution requires valid, current human authorization, server-side 60-second expiry enforcement, and verified exchange permissions with withdrawal capability absent. |
| VS-07 Notifications | VS-03; VS-05; notification infrastructure; Transactional Outbox | Notifications communicate signals and authorization events through the approved Transactional Outbox pattern. |
| VS-08 Supporting Investment Features | VS-01; relevant data from VS-03, VS-04, VS-06 | Supporting features rely on user, signal, plan, and trade records. |
| VS-09 Integration and Final Validation | VS-01 through VS-08 | Final validation requires integrated application workflows. |

## Accepted Decision Dependencies
- OQ-01: TypeScript, NestJS, React and PostgreSQL; initial exchange integration is simulated.
- OQ-04: Fail safely and reconcile uncertain exchange outcomes; no blind retries.
- OQ-05: Resume future eligible tranches only; require fresh authorization.
- OQ-07: Optional audio summaries do not participate in authorization or execution.
- OQ-08: Rolling 30-day outcome-based accuracy is measurement-only.
- OQ-09: Quality targets are verified in VS-09.

## Cross-Cutting Dependencies
- Database and persistence foundation.
- Configuration and secrets management.
- Logging and error handling.
- Module interfaces and ownership boundaries.
- Automated test infrastructure.
- Security controls and audit records.
- External provider interfaces and integration decisions.

## Dependency Rules
1. A slice must not bypass another module's ownership boundary.
2. Trade execution must depend on valid human authorization.
3. External integrations must use approved architectural ports.
4. Unresolved requirements or architecture questions must be recorded rather than silently assumed.
5. The team may revise dependencies after reviewing the actual implementation constraints.

## Architecture Restrictions

- Use the approved relational database for persistence and scheduling.
- Do not introduce Redis.
- Do not place a shared database client in `common/`.
- Each module owns its repositories and logical data access.
- Preserve the approved Modular Monolith and Ports and Adapters architecture.

## Reconciled Decision Dependencies

- OQ-04 / VS-06: block new execution requests during exchange unavailability; reconcile uncertain outcomes after recovery; use idempotency protection; never blindly retry or extend authorization expiry.
- OQ-05 / VS-05: resume only future eligible tranches; missed tranches remain permanently skipped; require fresh authorization.
- OQ-07 / VS-07: optional audio is generated from the approved written summary; audio failure must not interrupt core workflows.
- OQ-08 / VS-08: accuracy reporting is measurement-only and must show sample size and insufficient-data status where appropriate.
- OQ-09 / VS-09: quality targets require documented test conditions and evidence.

The accepted OQ-01 stack is TypeScript, NestJS, React and PostgreSQL. The initial exchange adapter remains simulated.
