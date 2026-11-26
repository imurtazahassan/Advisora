# Contributing to ADVISORA

## Local checks

Install the backend and frontend from their lockfiles, then run:

```sh
npm test
npm run test:e2e
npm run test:frontend
npm run build
npm run lint
```

For persistence changes, test migrations against an isolated PostgreSQL database and record the server version, commands, and result. In-memory adapter results must never be described as PostgreSQL verification.

## Safety boundaries

- Preserve the approved PRD, architecture, ADRs, and requirements traceability.
- Keep unresolved financial rules fail-closed and explicitly marked `PENDING_POLICY`.
- Do not add invented target yields, eligibility thresholds, or risk rules.
- Do not present simulated prices, execution, or notifications as live provider integrations.
- Do not add withdrawals or transfers, autonomous execution, or blind retries after uncertain outcomes.
- Keep secrets and local `.env` files out of commits.
- Document actual test evidence; never fabricate acceptance, contributions, or external integration status.
