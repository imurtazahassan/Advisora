# VS-06 — Authorized Trade Execution

## Added
- A simulated execution path is available only after a fresh one-time signed device challenge.
- Execution rechecks the 60-second server deadline, active plan/tranche, active signal, market-data age (15 seconds), ticker latency (5 seconds), and upward price shift (>2%).
- A database uniqueness constraint on tranche ID prevents duplicate simulated executions.
- Simulated execution ledger has a database trigger rejecting UPDATE and DELETE.
- No live exchange SDK, withdrawal, or transfer endpoint is included.

## Limitations
- Exchange provider selection remains open; this is simulated-only.
- No exchange API-key permission verification or secret vault integration exists. Keys must remain inactive if permissions cannot be verified.
- Device signature is not equivalent to native biometric authorization.
- Signal generation is fail-closed in VS-03 until approved target-yield and volatility specifications are supplied; plans without a valid linked signal cannot execute.
