# ADR-004: Authentication and Trade Authorization Boundary

## Status
**Accepted**

## Date
15 November 2026

## Context
The application interfaces directly with external cryptocurrency exchanges holding user funds. To prevent unauthorized trades or automated trading bot behavior, the system requires explicit, verified human authorization per tranche. The architectural design must enforce a strict separation between user sessions, plan configuration, tranche authorization, and order execution, while solving the device/server trust boundary for biometrics.

## Related ASRs
- **ASRs:** ASR-01, ASR-02, ASR-06, ASR-08
- **Constraints:** XC-01, XC-02, XC-05, XC-06

## Alternatives Considered

### Alternative 1: Trust Mobile Client "Success" Flag
- **Description:** Mobile app prompts Face ID/PIN and sends `{authorized: true}` to server.
- **Pros:** Trivial to implement.
- **Cons:** Fatal security flaw. A compromised client or modified HTTP request can fabricate authorizations without human interaction. Fails NFR-02 and C-01.

### Alternative 2: OTP-Per-Tranche Authorization
- **Description:** Server sends an SMS/Email OTP for each individual tranche order.
- **Pros:** Server-verifiable without mobile trust complexity.
- **Cons:** Violates Resolved OQ-06 (which mandates native OS biometrics / PIN); OTP is designated strictly for PIN recovery. Fails 60-second window usability.

### Alternative 3: 4-Stage Separation with Device-Signed Ephemeral Order Grant Tokens (Selected)
- **Description:** Establishes a four-stage boundary pipeline:
  1. *User Login/Session:* Standard user session token.
  2. *Plan Approval:* Establishes schedule; executes zero trades.
  3. *Tranche Authorization:* Mobile OS biometrics/PIN unlocks a device-bound key in the secure enclave to sign a short-lived authorization challenge token (`tranche_id`, `expires_at`).
  4. *Order Execution:* Server verifies signature against registered device public key and validates `now() <= expires_at` atomically before signing exchange order.

## Decision
The team selects **Alternative 3: 4-Stage Separation with Device-Signed Ephemeral Order Grant Tokens**.

### Four-Stage Structural Separation:
```
[User Session] ──▶ [Plan Approval (Zero Trades)] ──▶ [Tranche Auth Gate (<60s TTL)] ──▶ [Trade Execution]
```

### Authorization Rules:
1. **Server-Side Expiry Enforcement (XC-05):** The 60-second authorization window is anchored to a server-side timestamp (`authorization_expires_at`). Verifications completing at second 61 fail closed and the tranche is permanently skipped.
2. **Pre-Execution Check:** Before order dispatch, the server synchronously validates:
   - Grant token cryptographic validity and expiry ($\le 60\text{s}$).
   - Market data freshness ($<5\text{s}$ latency, $<15\text{s}$ staleness).
   - Price shift condition: current price $\le$ entry price $\times 1.02$ (strict $>2.0\%$ triggers lock).
3. **PIN Recovery Isolation:** PIN recovery requires 2FA OTP verification delivered to registered phone/email (Resolved OQ-06).

## Rationale
- **Eliminates Autonomous Execution (XC-02):** Cryptographically impossible for backend schedulers to submit trades without a freshly signed device grant token.
- **Deterministic Fail-Closed Design:** Late authentications fail closed without ambiguity.

## Trade-offs and Consequences
- **Benefits:** Rigorous security satisfying financial advisory standards; clean separation of concerns.
- **Limitations & Open Details:** Device registration, key rollover, and lost device recovery details remain open implementation details under U-07/HV-14.

## Security Implications
Protects against both malicious client tampering and rogue automated backend processes.

## Dependencies
Builds upon ADR-001 (Modular Monolith), ADR-002 (Boundaries), and ADR-003 (Relational Persistence).

## Human Approval
- **Approved by:** Muhammad Ahmad (23i-3083) and Murtaza Hassan (25i2603)
- **Status:** Accepted (15 November 2026)
