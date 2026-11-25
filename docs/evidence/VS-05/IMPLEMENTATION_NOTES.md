# VS-05 — Tranche Scheduling and Human Authorization

## Added
- Background scheduler checks due tranches every five seconds.
- Scheduler only opens a 60-second authorization window; it never executes orders.
- Expired authorization windows are permanently marked SKIPPED.
- Pause/cancel revokes open authorization windows; resume schedules remaining tranches into future 24-hour slots without backfilling missed slots.
- One-time challenge records bind nonce, tranche ID and expiry.
- Server checks plan state, tranche state, challenge consumption, registered-device status, signal validity, market-data freshness/latency, and strict upward price-shift threshold.

## Important limitation
The browser frontend does not provide a native OS biometric assertion or secure-enclave integration. Ed25519 device signatures are a cryptographic device-possession foundation only. Native biometric-gated key use and PIN recovery OTP are still required before claiming ADR-004 production compliance.
