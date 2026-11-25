# ADVISORA API Reference (Integrated Demo)

All endpoints except registration/login require `Authorization: Bearer <access_token>`.

## Authentication and devices
- `POST /auth/register` — `{ email, password }`
- `POST /auth/login` — `{ email, password }`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/devices`
- `POST /auth/devices/challenge`
- `POST /auth/devices` — register Ed25519 public key with signed registration challenge
- `POST /auth/devices/:id/authorization-challenge`
- `POST /auth/devices/:id/verify`
- `DELETE /auth/devices/:id`

## Market and advisory
- `GET /market-data` — simulated market status and policy classification
- `POST /market-data/refresh` — refresh simulated ticks
- `POST /advisories/generate` — deliberately fail-closed until approved target-yield/volatility rules are configured
- `GET /advisories`
- `GET /advisories/accuracy`

## Plans and tranches
- `POST /plans` — `{ symbol, quoteAsset, availableBalance, allocationPct, signalId? }`; balance is simulated/manual
- `GET /plans`
- `GET /plans/:id`
- `POST /plans/:id/pause`
- `POST /plans/:id/resume`
- `POST /plans/:id/cancel`
- `POST /plans/:id/adjust` — cancels the old unexecuted remainder and creates a replacement plan
- `POST /scheduler/tick` — manually advances due/expired windows for the signed-in user; automatic scheduler also checks every five seconds

## Individual authorization and simulated execution
- `POST /tranches/:id/authorization-challenge` — `{ deviceId }`
- `POST /tranches/:id/authorize` — `{ challengeId, deviceId, signature }`

The signed message is a JSON challenge bound to nonce, tranche ID and expiry. The server verifies it against the registered Ed25519 public key. This is not native biometric proof; the mobile secure-enclave/OS biometric flow is not included. Execution is simulated only and requires an active linked advisory signal plus all server-side safety checks.

## Supporting features
- `GET /watchlist`
- `POST /watchlist` — `{ symbol }`
- `DELETE /watchlist/:symbol`
- `GET /journal`
- `POST /journal` — `{ title, body, signalId?, planId? }`
- `PUT /journal/:id`
- `DELETE /journal/:id`
- `GET /notifications` — in-app outbox history only
- `GET /trades?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /trades/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`

There are no withdrawal, transfer, live order, WhatsApp provider, or mobile push provider endpoints in this simulated build.
