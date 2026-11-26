# VS-04 test evidence

**Run date:** 2026-11-26

`vs04-vs06-workflow.e2e-spec.ts` passed in the in-memory development/test adapter as part of `npm run test:e2e` (3 suites, 7 tests). It verifies authentication for plan access, rejects allocation above 5%, creates a plan with three scheduled tranches, confirms plan creation records no trade, confirms another user cannot fetch the plan, and checks the plan-created outbox event.

The plan-policy unit suite also passed as part of the 42 backend unit tests. This does not verify PostgreSQL transactions or make the slice accepted.

**Status:** Focused plan workflow checks passed; VS-04 is not accepted.
