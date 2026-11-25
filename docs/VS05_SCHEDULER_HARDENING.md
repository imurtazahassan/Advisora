# VS-05 Scheduler Hardening Notes

Date: 2026-11-25

## Changes in this implementation pass

1. The scheduler polls PostgreSQL-backed tranche rows; it does not use Redis or an in-memory schedule as the source of truth.
2. A tranche can open an authorization window only while its persisted scheduled slot is current. `authorization_expires_at` is set from the scheduled timestamp plus 60 seconds, so a delayed poll does not extend a missed slot.
3. A scheduled slot whose 60-second window has elapsed transitions permanently to `SKIPPED`.
4. An open authorization window that expires transitions permanently to `SKIPPED`.
5. Opening a window and writing its in-app outbox event occur in the same SQL statement. Missed/expired skip transitions and their outbox events use the same pattern.
6. Pause changes pending scheduled/open tranches to `PAUSED`, clears the active expiry, and makes the authorization gate fail closed.
7. Resume permanently skips paused tranches whose scheduled time has passed. Only future tranches return to `SCHEDULED`; they are placed on the next 24-hour intervals from resume time. No missed tranche is backfilled or opened immediately on resume.
8. Plan adjustment now cancels the old plan's remaining unexecuted tranches and creates the replacement plan/tranches in one database transaction. If replacement validation or insertion fails, the old plan remains unchanged.

## Boundary behavior

| Scenario | Expected state/result |
|---|---|
| Scheduler runs before scheduled time | Remains `SCHEDULED` |
| Scheduler runs at scheduled time | Opens authorization; expiry is scheduled time + 60 seconds |
| Scheduler runs during the 60-second slot | Opens only the remaining part of the original slot |
| Scheduler runs after the slot elapsed | Permanently `SKIPPED` |
| Authorization completes exactly at expiry | Accepted by the existing policy boundary (`completedAt <= expiresAt`) |
| Authorization completes after expiry | Rejected |
| Plan is paused with an open prompt | Prompt revoked; tranche becomes `PAUSED` |
| Resume after a paused tranche's schedule passed | Tranche permanently `SKIPPED` |
| Resume with future paused tranches | Future tranches scheduled at 24-hour intervals from resume; no immediate prompt |
| Duplicate scheduler poll | Row status predicates prevent duplicate opening/outbox events |

## Verification status

- TypeScript/TSX parser check: 46 files parsed, zero syntax errors.
- Jest tests: not run; dependency installation timed out in this environment.
- Full TypeScript type-check/build: not run; dependencies and type definitions are unavailable.
- PostgreSQL migration and scheduler SQL integration: not run; PostgreSQL server/client is unavailable here.
- Human acceptance: pending.

These notes describe code behavior and intended boundaries; they are not a claim of full VS-05 acceptance.
