# VS-04 — Investment Plan Management

## Added
- Authenticated plan create/list/detail endpoints.
- Maximum 5% allocation validation and rejection of zero/negative values.
- Three equal tranche amounts rounded down to the configured simulated USDT precision (2 decimal places).
- Three scheduled tranche rows created in one database transaction.
- Pause, resume, cancel, and adjust/restart endpoints; executed rows are retained.
- Plan creation writes an in-app outbox event and does not create a trade.
- Frontend plan form and lifecycle controls.

## Explicit implementation assumptions / limits
- The exchange balance is a user-entered simulated balance, not a verified connected-exchange balance.
- The initial schedule anchor is currently the plan approval timestamp (first tranche due immediately); the PRD says the anchor is not separately specified. Human confirmation is required before production use.
- The simulated quote adapter currently uses two decimal places for USDT. Currency precision must be adapter metadata before other quote currencies are supported.
- No slice is accepted until database and automated tests pass.
