# ADVISORA Change Log — Scheduler Hardening Pass

## 2026-11-25

- Prevented scheduler polling delays from extending the persisted 60-second tranche slot.
- Added permanent skip handling for missed scheduled slots and expired authorization windows.
- Made scheduler state transitions and in-app notification outbox writes atomic per SQL statement.
- Updated pause/resume behavior to revoke prompts, skip tranches missed while paused, and schedule only future tranches at 24-hour intervals from resume.
- Made plan replacement/cancellation atomic in one database transaction.
- Added policy boundary tests and a scheduler hardening note.

## Verification caveat

This pass passed TypeScript/TSX syntax parsing for 46 files. Dependency installation timed out, so Jest, full type-check/build, and PostgreSQL integration were not executed. The changes are not an accepted vertical slice until those checks and human review pass.
