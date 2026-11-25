# ADR-005: External Integration Boundaries and Decoupled Messaging

## Status
**Accepted**

## Date
15 November 2026

## Context
The system integrates with multiple external providers: digital asset exchanges (WebSocket and REST), WhatsApp Business API, Mobile Push services (FCM/APNs), and SMS/Email OTP gateways. Each external boundary introduces failure modes, rate limits, and latency spikes that must not degrade the core 60-second trade authorization loop.

## Related ASRs
- **ASRs:** ASR-03, ASR-06, ASR-07, ASR-08, ASR-10
- **Constraints:** XC-04, XC-06, XC-09, XC-10, XC-11

## Alternatives Considered

### Alternative 1: Direct Synchronous In-Line Integration Calls
- **Description:** Directly calling external REST APIs (WhatsApp, FCM, Exchange) inside web handlers and signal generation loops.
- **Pros:** Minimal boilerplate.
- **Cons:** If WhatsApp or FCM latency spikes to 5–8 seconds, the user's 60-second validity window is consumed before receiving the alert. Gateway outages directly crash core business transactions.

### Alternative 2: External Distributed Message Broker (Kafka / RabbitMQ)
- **Description:** Deploying an external broker cluster to decouple event processing.
- **Pros:** Extreme message throughput.
- **Cons:** Disproportionate operational burden for a 2-person team; unnecessary daemon maintenance during academic grading demos.

### Alternative 3: Abstracted Port Adapters with Transactional Outbox Pattern (Selected)
- **Description:** External systems are wrapped in strict Port/Adapter interfaces. Asynchronous notification dispatch uses the Transactional Outbox pattern: notification tasks are written atomically to a database table during signal creation, and dispatched by a decoupled worker pool.

## Decision
The team selects **Alternative 3: Abstracted Port Adapters with Transactional Outbox Pattern**.

### Integration Specifications:
1. **Exchange WebSocket Feed (`IMarketDataFeedPort`):** Managed by `market_ingestion`. Tracks latency and data timestamp. Trips circuit breaker (lock Buy, display "Market Data Unavailable") if latency > 5s or staleness > 15s (XC-06). Exchange vendor kept open (OQ-01).
2. **Exchange REST Trading (`IExchangeTradingPort`):** Managed by `credential_management` and `trade_execution`. Exposes strictly: `verifyPermissions()`, `getQuoteBalance()`, `placeSpotMarketBuy()`. Zero withdrawal methods (XC-04). If withdrawal permissions cannot be verified as absent, key stays inactive (XC-11).
3. **Notification Gateways (`INotificationPort`):** Decoupled via `notification_outbox`. Background workers dispatch to WhatsApp and Push adapters with strict 5-second timeouts. If one channel fails, the other proceeds independently. Tracks provider acceptance for 95% / 10s SLA without misrepresenting as device delivery (XC-10).
4. **Urdu Translation Fallback:** If Urdu translation fails, dispatch proceeds immediately with English and standard fallback text: *"Detailed Urdu explanation currently unavailable."* (XC-09).
5. **OTP Delivery (`IOTPDeliveryPort`):** Dedicated port owned by `user_notifications`, isolated from marketing/advisory channels.

## Rationale
- **Isolation of Core Engine:** Third-party cloud outages or rate limits cannot block signal generation or order authorization.
- **Adherence to OQ-01:** Abstracting exchange communication behind `IMarketDataFeedPort` and `IExchangeTradingPort` ensures the core system is agnostic to the specific exchange selected in release 1.

## Trade-offs and Consequences
- **Benefits:** High fault tolerance, strict compliance with NFR-04 SLA, clean separation of third-party SDKs.
- **Limitations:** Outbox worker adds a slight polling delay (sub-second), easily accommodated within the 10-second delivery target.

## Security Implications
Prevents API credential leakage and guarantees that external provider callbacks cannot manipulate trade authorization state.

## Dependencies
Builds upon ADR-001 (Modular Monolith) and ADR-002 (Boundaries).

## Human Approval
- **Approved by:** Muhammad Ahmad (23i-3083) and Murtaza Hassan (25i2603)
- **Status:** Accepted (15 November 2026)
