# Final PRD.md
## Human-Controlled Digital-Asset Advisory Application

**Status:** FINAL — approved by the team after final review and validation  
**Scope:** Task 5 requirements baseline  
**Functional requirements:** FR-01–FR-14  
**Non-functional requirements:** NFR-01–NFR-04  
**Business rules:** BR-01–BR-12  
**Constraints:** C-01–C-06  
**Open questions:** OQ-01, OQ-04, OQ-05, OQ-07, OQ-08, OQ-09 (see Section 10; resolved decisions are no longer open)

> **Baseline note:** Requirements and decisions explicitly accepted by the team are recorded as approved. Open questions remain unresolved unless a prior team decision already settled the relevant behavior. This document does not infer automatic stop-loss execution, guaranteed returns, or authorization beyond the rules stated below.

---

## 1. Product Intent

To provide a transparent, human-controlled digital-asset advisory application for non-technical retail savers that delivers understandable trade recommendations, supports phased investment planning, enforces predefined risk limits, and requires explicit user authorization for every individual order.

## 2. Validated User Need

The non-technical retail saver needs an accessible, transparent way to evaluate digital-asset recommendations and manually authorize phased investments, so they can protect their savings' purchasing power against inflation without risking severe capital loss or surrendering control to automated trading systems.

## 3. User Goals

1. Understand recommendations through beginner-friendly English and Urdu explanations.
2. Receive timely recommendations through WhatsApp and mobile push notifications.
3. Decide whether to approve or reject each individual trade.
4. Invest gradually through three tranches.
5. Limit exposure to capital they can afford to risk.
6. Monitor recommendations and understand historical performance.
7. Pause, cancel, restart, or adjust a plan as circumstances or markets change.
8. Retain control over every trade and prevent unauthorized withdrawals or transfers.

## 4. Product Goals

- **G1:** Provide understandable recommendations in English and Urdu.
- **G2:** Require PIN or biometric authorization for every individual tranche order.
- **G3:** Limit a plan to a maximum of 5% of total user capital, while permitting lower selected allocations.
- **G4:** Divide the plan into three equal tranches scheduled 24 hours apart.
- **G5:** Expire advisory signals after one minute and block purchases when the agreed price-shift threshold is exceeded.
- **G6:** Suppress new buy signals when an asset moves more than 5% within a one-hour window.
- **G7:** Support pausing, cancelling, restarting, and adjusting plans.
- **G8:** Calculate Signal Accuracy over a rolling 30-day period using the target profit yield and 3% maximum loss limit.
- **G9:** Require exchange API keys to have read and trade access but no withdrawal permissions.

## 5. Product Non-Goals

- **NG1:** Fully automated trading without explicit per-order authorization.
- **NG2:** Automatic execution of scheduled tranches without renewed PIN or biometric authorization.
- **NG3:** Withdrawals or transfers through the application.
- **NG4:** Aggressive speculative trading that prioritizes returns over capital preservation.
- **NG5:** Requiring users to perform technical chart analysis or interpret complex indicators.
- **NG6:** Guaranteeing profits or eliminating all investment risk.

---

## 6. Functional Requirements

Acceptance criteria use Given/When/Then language. Edge cases are included after each related requirement. Thresholds use strict “more than” semantics where specified.

### FR-01 — Generate Advisory Signals

**Requirement:** The system shall generate advisory signals for eligible, conservative digital assets, with the information a user needs to evaluate a recommendation.

- **AC-01.1 — Required signal content**
  - **Given** the system generates an advisory signal,
  - **When** the signal is prepared for display or delivery,
  - **Then** it shall include the asset name, entry price, target profit yield, risk context, and beginner-friendly English and Urdu explanations.
- **AC-01.2 — Volatility suppression**
  - **Given** an asset's price moves more than 5% upward or downward within a one-hour window,
  - **When** the system considers generating a new buy signal for that asset,
  - **Then** it shall suppress the signal and show a “Market Volatility Warning” until movement settles below the threshold.
- **AC-01.3 — Conservative asset eligibility**
  - **Given** the system evaluates an asset for recommendation,
  - **When** the asset does not meet the agreed conservative asset-selection criteria,
  - **Then** the system shall not recommend it. Eligible assets are Bitcoin and Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, provided they meet conservative high-liquidity criteria; high-risk altcoins and illiquid tokens remain excluded.

**Edge cases**
- Eligible assets are Bitcoin and Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, provided they meet the conservative high-liquidity criteria. High-risk altcoins and illiquid tokens are excluded. The objective definition/source for classifying “high-risk” and “illiquid,” and the authoritative global-volume ranking source, remain implementation details to document.
- Volatility is evaluated per asset; a volatile asset does not automatically suppress signals for unaffected assets.
- The warning and suppression end when the movement settles below the threshold; exact measurement and reset logic remain an implementation detail to define.

### FR-02 — Deliver Notifications

**Requirement:** The system shall deliver generated advisory signals through WhatsApp and mobile push notification channels.

- **AC-02.1 — Dispatch**
  - **Given** an advisory signal has been generated,
  - **When** notification dispatch is initiated,
  - **Then** the system shall attempt delivery through the configured WhatsApp and mobile push channels with enough information for the user to identify and review the signal.
- **AC-02.2 — Consistent content**
  - **Given** the same signal is sent through both channels,
  - **When** the user compares the notifications,
  - **Then** the asset, entry price, target yield, and risk context shall not conflict between channels.
- **AC-02.3 — Accurate delivery status**
  - **Given** a notification channel is unavailable or rejects delivery,
  - **When** the system reports dispatch status,
  - **Then** it shall not falsely report successful delivery on that channel.

**Edge cases**
- If one channel fails, send through the channel that succeeds; do not perform continuous retries that consume the one-minute signal-validity window.
- If both channels fail, do not report successful delivery.
- The signal remains available on the in-app dashboard during its one-minute validity window regardless of notification delivery status.
- Duplicate notifications must not create duplicate authorization attempts or orders.

### FR-03 — Provide Bilingual Risk Context

**Requirement:** Each advisory signal shall provide beginner-friendly recommendation and risk explanations in English and Urdu.

- **AC-03.1 — Two languages**
  - **Given** an advisory signal is prepared,
  - **When** its explanations are displayed or dispatched,
  - **Then** English and Urdu explanations shall be provided.
- **AC-03.2 — Required context**
  - **Given** a user reviews a signal,
  - **When** the signal details are shown,
  - **Then** the asset name, entry price, target profit yield, and risk context shall be identifiable.
- **AC-03.3 — Urdu translation failure**
  - **Given** Urdu translation fails or times out,
  - **When** the signal is dispatched,
  - **Then** the system shall dispatch the English explanation with the standard Urdu fallback notice **“Detailed Urdu explanation currently unavailable.”** and shall not delay or cancel the signal.

**Edge cases**
- Do not silently represent a signal as fully bilingual when its detailed Urdu translation failed.
- Audio summaries are not confirmed as a first-release requirement; see OQ-07.

### FR-04 — Enforce Signal Validity and Price-Shift Rules

**Requirement:** Each advisory signal shall remain valid for exactly one minute after generation unless invalidated earlier by a price increase exceeding 2.0% between signal generation and the user's approval attempt.


**Approved market-data rule:** Use the connected exchange’s real-time WebSocket ticker stream as the primary reference price. During authorization, lock the Buy button and display **“Market Data Unavailable”** if ticker latency exceeds 5 seconds or market data is delayed by more than 15 seconds. The system shall not authorize an order while either condition applies.

- **AC-04.1 — One-minute expiry**
  - **Given** an advisory signal is generated,
  - **When** one minute has elapsed,
  - **Then** the signal shall expire and can no longer authorize the associated trade.
- **AC-04.2 — Price-shift invalidation**
  - **Given** a signal is within its validity window,
  - **When** the asset price has increased by more than 2.0% between generation and the approval attempt,
  - **Then** the system shall lock the Buy button, display “Price Shift Alert,” and invalidate the recommendation.
- **AC-04.3 — Exact 2.0% boundary**
  - **Given** the price increase is exactly 2.0%,
  - **When** the system evaluates the price-shift condition,
  - **Then** the strict greater-than threshold shall not trigger the Price Shift Alert by itself.
- **AC-04.4 — Previously invalidated signal**
  - **Given** a signal was invalidated before its expiry time,
  - **When** the user attempts to authorize it,
  - **Then** the system shall reject authorization.

**Edge cases**
- Check validity at the point of authorization, not only when the notification was created or opened.
- Price Shift is triggered by an upward increase greater than 2.0%; a downward price change does not itself trigger the Price Shift Alert.
- A drop greater than 3% from entry affects Signal Accuracy, not automatic trade closure.
- If the user opens an expired notification, display “Expired Signal” and keep the Buy button disabled.
- If high volatility triggers while a signal is active, immediately invalidate that signal, lock Buy, and show the Market Volatility Warning.
- Repeated delivery or opening of the same signal must not create duplicate orders.

### FR-05 — Configure and Approve Capital Allocation

**Requirement:** The system shall allow the user to choose a positive allocation percentage up to 5% of total user capital and configure a three-tranche plan.

- **AC-05.1 — Maximum allocation**
  - **Given** the user enters an allocation percentage,
  - **When** it is greater than 5%,
  - **Then** the system shall reject it.
- **AC-05.2 — Lower allocation**
  - **Given** the user selects a positive allocation below or equal to 5%,
  - **When** the plan is configured,
  - **Then** the system shall use the selected percentage.
- **AC-05.3 — Three equal tranches**
  - **Given** a valid allocation is selected,
  - **When** the plan is created,
  - **Then** the total allocation shall be divided into three equal tranches scheduled at fixed 24-hour intervals.
- **AC-05.4 — Plan approval is not trade authorization**
  - **Given** the user approves the overall plan,
  - **When** the plan is established,
  - **Then** the system shall establish the plan and schedule without executing a trade solely because of Plan Approval.
- **AC-05.5 — Invalid allocation**
  - **Given** the entered allocation is zero, negative, or invalid,
  - **When** the user submits the plan,
  - **Then** the system shall reject the allocation.

**Edge cases**
- Exactly 5% is permitted if all other validations pass; more than 5% is rejected.
- Minimum permitted allocation and numeric input precision require specification.
- Tranche amounts are fixed at Plan Approval using the capital balance at setup. Wallet-balance changes do not recalculate an active plan unless the user manually adjusts or restarts it.
- Round each tranche amount down to the nearest whole smallest currency unit (for example, cents or satoshis). Any fractional remainder stays unallocated in the wallet so the sum of the three tranches does not exceed the approved allocation or 5% cap.

### FR-06 — Schedule Tranches and Require Individual Authorization

**Requirement:** The system shall schedule three tranches at fixed 24-hour intervals and require separate PIN or biometric authorization before each individual tranche order.

- **AC-06.1 — Scheduling**
  - **Given** a plan is approved,
  - **When** its schedule is established,
  - **Then** three tranches shall be scheduled at fixed 24-hour intervals.
- **AC-06.2 — Individual authorization**
  - **Given** a tranche is due for authorization,
  - **When** the user attempts to proceed,
  - **Then** the system shall require PIN or biometric verification for that tranche.
- **AC-06.3 — Plan approval boundary**
  - **Given** the user approved the overall plan,
  - **When** a later tranche becomes due,
  - **Then** the system shall still require separate Trade Authorization for that tranche.
- **AC-06.4 — Execute only after successful checks**
  - **Given** the signal and tranche remain valid and all required checks pass,
  - **When** the user successfully completes authorization within the allowed window,
  - **Then** the system may proceed with the order.
- **AC-06.5 — Failed or cancelled authorization**
  - **Given** authorization fails or is cancelled,
  - **When** the system processes the attempt,
  - **Then** the tranche shall not execute.

**Edge cases**
- PIN retry limits and authentication fallback procedures remain open.
- The precise initial schedule anchor is not separately specified beyond the approved 24-hour interval rule.
- Authorization verification must complete within the one-minute window. If verification starts before expiry but the verification response completes after 60 seconds, reject the order, expire and permanently skip the tranche.
- A plan approval never authorizes future tranche orders.

### FR-07 — Expire and Skip Unauthorized Tranches

**Requirement:** A scheduled tranche that is not individually authorized within its one-minute authorization window shall expire and be skipped permanently.

- **AC-07.1 — Authorization window**
  - **Given** a tranche becomes available for authorization,
  - **When** its authorization window opens,
  - **Then** the user shall have one minute to complete authorization.
- **AC-07.2 — Expire and skip**
  - **Given** authorization is not completed within one minute,
  - **When** the window closes,
  - **Then** the tranche shall expire and be permanently skipped.
- **AC-07.3 — No automatic later execution**
  - **Given** a tranche has expired,
  - **When** a later time arrives,
  - **Then** the system shall not keep it pending or automatically execute it.
- **AC-07.4 — Later tranches**
  - **Given** one tranche was skipped,
  - **When** a subsequent tranche becomes due,
  - **Then** it may continue under its schedule but still requires separate authorization.
- **AC-07.5 — Restart or adjustment**
  - **Given** the user restarts or adjusts a plan,
  - **When** the new plan is initialized,
  - **Then** the system shall recalculate using current available wallet balance, the newly selected percentage, and current market conditions, subject to the 5% cap.

**Edge cases**
- An expired tranche is permanently skipped; subsequent scheduled tranches remain separately gated by authorization.
- If the wallet has insufficient funds when a tranche activates, automatically skip that tranche, notify the user through push and WhatsApp, and leave the plan active for the next scheduled tranche 24 hours later.
- Duplicate submissions for the same tranche must not create duplicate orders.

### FR-08 — Pause, Cancel, Restart, or Adjust a Plan

**Requirement:** The system shall allow users to pause upcoming tranches, permanently cancel remaining unexecuted tranches, and restart or adjust a plan.

- **AC-08.1 — Pause**
  - **Given** a plan has upcoming unexecuted tranches,
  - **When** the user pauses it,
  - **Then** upcoming tranches shall be paused and executed tranches shall remain unaffected.
- **AC-08.2 — Cancel**
  - **Given** a plan has remaining unexecuted tranches,
  - **When** the user cancels it,
  - **Then** all remaining unexecuted tranches shall be permanently cancelled without additional fees or penalties; executed tranches remain unaffected.
- **AC-08.3 — Restart or adjust**
  - **Given** the user restarts or adjusts a plan,
  - **When** the new plan is calculated,
  - **Then** it shall use the current available wallet balance, the newly selected allocation percentage, and current market conditions.
- **AC-08.4 — Preserve executed tranches**
  - **Given** a plan is paused, cancelled, restarted, or adjusted,
  - **When** the portfolio is displayed,
  - **Then** previously executed tranches shall remain in the portfolio.
- **AC-08.5 — Apply cap to new plan**
  - **Given** a new plan is created,
  - **When** its allocation is validated,
  - **Then** it shall comply with the maximum 5% cap.

**Edge cases**
- Pause or cancellation immediately closes/revokes an active one-minute authorization window.
- If an order was already successfully authorized and submitted to the exchange order book before the pause/cancellation takes effect, that order may complete; later unexecuted tranches are locked or deleted according to the requested action.
- If PIN/biometric verification returns after a pause action, reject/block the order from exchange submission.
- Resuming after a scheduled interval has passed must not trigger missed intervals retroactively or immediately. The next remaining tranche follows the next applicable 24-hour interval.
- Restarting after prior execution preserves executed tranches and creates a fresh plan based on current figures.
- Adjusting or restarting automatically cancels remaining unexecuted tranches of the active plan and initializes a fresh three-tranche schedule using current available wallet balance and current market price.
- Restarting after cancellation creates a fresh plan using current figures, subject to the 5% cap.
- Rapid repeated Pause/Resume actions shall be serialized through UI state locking/debouncing to prevent race conditions, duplicate notifications, or conflicting plan states.

### FR-09 — Pause an Active Plan

**Requirement:** The system shall provide a plan-pause control that pauses upcoming tranches and revokes active authorization prompts.

- **AC-09.1 — Pause upcoming tranches**
  - **Given** a plan is active,
  - **When** the user selects Pause,
  - **Then** the plan shall enter Paused state and authorization notifications for upcoming tranches shall be suppressed until the plan is resumed or adjusted.
- **AC-09.2 — Pause during an authorization window**
  - **Given** a tranche has an active one-minute authorization window,
  - **When** the user pauses the plan,
  - **Then** the prompt shall be revoked immediately, Buy shall be locked, and the tranche shall enter the paused state.
- **AC-09.3 — Preserve portfolio**
  - **Given** a plan is paused,
  - **When** portfolio records are displayed,
  - **Then** executed trades shall remain in the portfolio ledger.
- **AC-09.4 — Resume**
  - **Given** a plan is paused,
  - **When** the user resumes it,
  - **Then** remaining unexecuted tranches shall resume under their fixed amounts, with the next tranche scheduled for the next applicable 24-hour interval and no retroactive execution.

**Edge cases**
- If authentication processing completes after Pause, reject/block the order from exchange submission.
- Rapid Pause/Resume requests must be serialized using UI state locking/debouncing.

### FR-10 — Cancel Remaining Tranches

**Requirement:** The system shall let users permanently cancel all remaining unexecuted tranches of a plan.

- **AC-10.1 — Permanent cancellation**
  - **Given** a plan has unexecuted tranches,
  - **When** the user selects Cancel Plan,
  - **Then** all unexecuted tranches shall be permanently deleted/cancelled and the plan shall enter Cancelled state.
- **AC-10.2 — Close active authorization**
  - **Given** a tranche has an open authorization window,
  - **When** cancellation completes,
  - **Then** the window shall close and any pending PIN/biometric verification shall be prevented from submitting an order.
- **AC-10.3 — In-flight order**
  - **Given** an order was already verified and submitted to the exchange order book before cancellation completes,
  - **When** cancellation is processed,
  - **Then** that submitted order may complete, while subsequent tranches are cancelled.
- **AC-10.4 — No cancellation penalty**
  - **Given** the user cancels a plan,
  - **When** the cancellation is applied,
  - **Then** the application shall not impose a penalty, platform fee, or account restriction for cancellation.

**Edge cases**
- Cancelling immediately after a tranche is authorized does not reverse an order already submitted to the exchange; later tranches are permanently deleted.
- Executed tranches remain in the portfolio.

### FR-11 — Restart or Adjust a Plan

**Requirement:** The system shall replace an active plan's remaining unexecuted tranches when the user restarts or adjusts it, recalculating a fresh plan from current figures.

- **AC-11.1 — Cancel old remainder**
  - **Given** an active plan has remaining unexecuted tranches,
  - **When** the user adjusts or restarts it,
  - **Then** the remaining unexecuted tranches of the old plan shall be cancelled.
- **AC-11.2 — Recalculate using current figures**
  - **Given** the user selects a new allocation percentage,
  - **When** the new plan is calculated,
  - **Then** the calculation shall use current available wallet balance and current market conditions, with allocation no greater than 5%.
- **AC-11.3 — Fresh schedule and rounding**
  - **Given** the new plan has been approved,
  - **When** its schedule is created,
  - **Then** the new allocation shall be divided into three equal amounts rounded down to the smallest currency unit, and a fresh 24-hour schedule shall start from the new Plan Approval timestamp.
- **AC-11.4 — Preserve executed assets**
  - **Given** the old plan had executed tranches,
  - **When** the new plan is created,
  - **Then** those executed assets shall remain in the portfolio and count toward total user capital.

**Edge cases**
- The new plan is calculated from the latest wallet balance and market conditions; previously executed tranches are not erased.
- A new plan is subject to the same 5% maximum allocation rule.

### FR-12 — Detect High Volatility and Suppress Buy Signals

**Requirement:** The system shall monitor price movements and suppress new buy signals when an asset moves more than 5% upward or downward within a one-hour window. It shall display a “Market Volatility Warning” until the movement settles below the threshold.

- **AC-12.1 — Upward volatility**
  - **Given** an asset's price is monitored over a one-hour window,
  - **When** its price increases by more than 5% within that window,
  - **Then** the system shall classify the asset as highly volatile, suppress new buy signals for it, and display the Market Volatility Warning.
- **AC-12.2 — Downward volatility**
  - **Given** an asset's price is monitored over a one-hour window,
  - **When** its price decreases by more than 5% within that window,
  - **Then** the system shall suppress new buy signals for it and display the warning.
- **AC-12.3 — Maintain suppression**
  - **Given** the high-volatility condition remains active,
  - **When** the system evaluates a new buy signal,
  - **Then** it shall not generate a new buy signal for that asset.
- **AC-12.4 — Clear warning**
  - **Given** a warning is active,
  - **When** the price movement settles below the 5% threshold,
  - **Then** the system shall clear the warning and end volatility-based suppression for that asset.
- **AC-12.5 — Invalidate active signal**
  - **Given** an advisory signal is active,
  - **When** its asset triggers high volatility,
  - **Then** the system shall immediately invalidate the signal, lock Buy, and display the Market Volatility Warning.

**Edge cases**
- Exactly 5% movement does not trigger a rule defined as more than 5%.
- Repeated threshold crossings keep suppression and warning active while the high-volatility condition is met.
- Volatility suppression is asset-specific.
- An active signal for the affected asset is invalidated immediately.
- The exact reference price, rolling-window calculation, and reset criteria require implementation detail.

### FR-13 — Calculate and Display Signal Accuracy

**Requirement:** The system shall calculate Signal Accuracy over a rolling 30-day period as the percentage of advisory signals that reach their target profit yield without the asset dropping more than 3% from entry price.

- **AC-13.1 — Rolling period**
  - **Given** signals were generated during the preceding 30-day period,
  - **When** Signal Accuracy is calculated,
  - **Then** only signals generated within that rolling period shall be evaluated against the agreed success criteria.
- **AC-13.2 — Successful signal**
  - **Given** a signal reaches its target profit yield and the asset has not dropped more than 3% from entry,
  - **When** the signal is evaluated,
  - **Then** it shall count as successful.
- **AC-13.3 — Loss-limit breach**
  - **Given** the asset drops more than 3% from the signal's entry price,
  - **When** the signal is evaluated,
  - **Then** it shall be marked as breaching the maximum loss limit and shall not count as successful.
- **AC-13.4 — Display result**
  - **Given** Signal Accuracy has been calculated,
  - **When** the user views performance information,
  - **Then** the system shall display the percentage as historical advisory-signal performance over the rolling 30-day period.
- **AC-13.5 — No guarantee**
  - **Given** Signal Accuracy is displayed,
  - **When** the user views the result,
  - **Then** it shall be presented as historical performance, not a guarantee of future returns.

**Edge cases**
- Exactly a 3% drop does not breach a threshold defined as more than 3%.
- A signal that breaches the 3% limit shall not count as successful even if the target is subsequently reached.
- If fewer than 30 days of signal history exist, disclose the available history rather than implying a full 30-day record.
- If there are no signals in the period, display “N/A” or an equivalent explanation rather than 0%.
- The 3% limit is a performance-measurement criterion only; it does not imply automatic stop-loss execution, automatic closure, or forced sale.

### FR-14 — Enforce Exchange API Key Permissions

**Requirement:** The system shall accept exchange API keys only when they provide read and trade permissions without withdrawal permissions. The application shall not provide withdrawal or transfer functions.


**Approved capital-balance rule:** Calculate total user capital and available allocation strictly from the connected exchange account’s available quote-asset balance (for example, USDT or USD). Exclude unconnected external wallets and balances from these calculations. Apply the 5% plan cap to this defined balance.

- **AC-14.1 — Accept permitted key**
  - **Given** a user submits an exchange API key,
  - **When** the system verifies read and trade access and confirms withdrawal permissions are absent,
  - **Then** it shall accept the key, subject to successful credential validation.
- **AC-14.2 — Reject withdrawal-enabled key**
  - **Given** a submitted key has withdrawal permissions,
  - **When** permissions are checked,
  - **Then** the system shall reject it and explain that withdrawal permissions must be disabled.
- **AC-14.3 — Reject insufficient permissions**
  - **Given** a submitted key lacks read or trade permission,
  - **When** permissions are checked,
  - **Then** the system shall reject it and explain which required permission is missing.
- **AC-14.4 — No withdrawals/transfers**
  - **Given** a user is connected to an exchange,
  - **When** the user views or attempts to use application controls,
  - **Then** the application shall not provide a function to withdraw or transfer funds.
- **AC-14.5 — Fail safely**
  - **Given** the system cannot reliably verify a key's permissions,
  - **When** the user attempts to connect it,
  - **Then** the system shall not activate the connection for trading until permissions are verified.

**Edge cases**
- Reject or keep inactive a key if withdrawal permissions cannot be inspected.
- If withdrawal permissions are enabled after connection, detect the change where supported and suspend trading access until resolved.
- An expired or revoked key shall not be reported as an operational exchange connection.
- A read-only key is insufficient for trade execution. Native device OS biometric procedures (such as Face ID or Touch ID) shall be used for biometric authorization. PIN recovery requires two-factor OTP verification sent to the user’s registered phone or email.
- A successful trading connection does not enable withdrawals or transfers through the application.

---

## 7. Non-Functional Requirements

### NFR-01 — Signal Processing & Validity Verification

**Requirement:** The system shall evaluate the one-minute signal expiry and 2.0% price-shift conditions before accepting a user's trade authorization, and shall reject any expired or invalidated signal.

**Verification:** Pass/fail. Every test case involving an expired or invalidated signal must prevent the associated order from being authorized. Across the test suite, enforcement of the one-minute signal expiry, the strict greater-than-2.0% price-shift lock, the 5% allocation cap, and the prohibition on withdrawal permissions must be 100%.

### NFR-02 — Authorization & Permission Security

**Requirement:** The system shall require successful PIN or biometric verification for every individual tranche order and reject exchange API keys that include withdrawal permissions.

**Verification:** Pass/fail. All unauthorized order attempts and keys with withdrawal permissions must be rejected in security tests. The test suite must demonstrate 100% enforcement of per-tranche authorization and zero acceptance of keys with withdrawal permissions. Native OS biometrics shall be used where selected; PIN recovery shall require two-factor OTP verification sent to the registered phone or email.

### NFR-03 — Bilingual Usability

**Requirement:** Every Advisory Signal shall provide its required risk context and recommendation explanation in both English and Urdu, using beginner-friendly wording.

**Verification:** Pass/fail. 100% of test signals contain both language versions and all required signal fields.

**Agreed fallback behavior:** If Urdu translation fails or times out, dispatch the English explanation with the standard Urdu notice: “Detailed Urdu explanation currently unavailable.” Do not delay or cancel the signal.

### NFR-04 — Notification Delivery

**Requirement:** The system shall deliver each generated Advisory Signal through the configured WhatsApp and mobile push notification channels.

**Verification target:** At least 95% of notifications accepted by each provider within 10 seconds of signal generation, tested over 1,000 dispatch attempts. Measure provider acceptance separately for each configured channel.

**Qualification:** Actual delivery depends on external provider availability. The 95% target is measured against provider acceptance, not a guarantee of end-device receipt. The validation sample is 1,000 test dispatches.

---

## 8. Business Rules

- **BR-01:** A plan's total allocation must not exceed 5% of total user capital; users may choose a lower percentage.
- **BR-02:** Each plan consists of three equal tranches scheduled at fixed 24-hour intervals.
- **BR-03:** Every individual tranche order requires separate PIN or biometric Trade Authorization.
- **BR-04:** An Advisory Signal expires exactly one minute after generation unless invalidated earlier by a price shift exceeding 2.0%.
- **BR-05:** A price increase exceeding 2.0% between signal generation and the approval attempt invalidates the recommendation and locks the Buy button.
- **BR-06:** An unauthorized scheduled tranche expires and is skipped permanently when its one-minute authorization window closes.
- **BR-07:** A price movement exceeding 5% in either direction within one hour suppresses new buy signals for that asset and triggers a Market Volatility Warning until movement settles below the threshold.
- **BR-08:** Signal Accuracy is measured over a rolling 30-day period, based on reaching the target profit yield without breaching the 3% loss limit.
- **BR-09:** Pausing or cancelling a plan does not reverse executed tranches; cancellation carries no extra fees or penalties.
- **BR-10:** Restarted or adjusted plans use current available wallet balance, the newly selected allocation, and current market conditions, subject to the 5% cap.
- **BR-11:** Exchange API keys must permit reading and trading but must not permit withdrawals; transfers and withdrawals through the app are disabled.
- **BR-12:** Advisory recommendations are restricted to Bitcoin and Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, provided they meet conservative high-liquidity criteria. High-risk altcoins and illiquid tokens are excluded.

**BR-08 clarification:** The 3% Maximum Loss Limit is strictly a performance-measurement criterion for Signal Accuracy. It does not constitute an automated operational stop-loss or forced sale.

---

## 9. Constraints

- **C-01:** The product is an advisory application with explicit user authorization for every order, not an autonomous trading bot.
- **C-02:** The initial scope is non-technical retail savers seeking conservative digital-asset exposure, with English and Urdu explanations.
- **C-03:** Trade execution depends on a supported exchange integration with appropriate read and trade permissions.
- **C-04:** WhatsApp and mobile push are the agreed notification channels; actual delivery may depend on external provider availability.
- **C-05:** The plan structure is fixed at three equal tranches separated by 24-hour intervals.
- **C-06:** The product does not guarantee profits or eliminate digital-asset investment risk.

---

## 10. Open Questions and Resolved Review Decisions

The following items were resolved and approved during final review; they are requirements, not open questions:

- **Resolved OQ-02 — Capital calculation:** Calculate total user capital and available allocation strictly from the connected exchange account’s available quote-asset balance (for example, USDT/USD). Exclude unconnected external wallets.
- **Resolved OQ-03 — Primary market-data source:** Use the connected exchange’s real-time WebSocket ticker stream as the primary reference price. During authorization, lock Buy and display “Market Data Unavailable” if ticker latency exceeds 5 seconds or market data is delayed by more than 15 seconds.
- **Resolved OQ-06 — Authentication recovery:** Use native device OS biometric procedures, including Face ID/Touch ID. PIN recovery requires two-factor OTP verification sent to the registered phone or email.
- **Resolved asset eligibility:** Recommend Bitcoin and Ethereum, or assets in the top 10 by global 24-hour spot volume, subject to conservative high-liquidity criteria; exclude high-risk altcoins and illiquid tokens.
- **Resolved verification sample:** Test notification provider acceptance across 1,000 dispatches. The required notification target remains at least 95% provider acceptance per channel within 10 seconds. The one-minute expiry, >2.0% price-shift lock, 5% cap, and zero-withdrawal-permission rule require 100% enforcement in tests.

The following questions remain open and must not be treated as settled requirements:

- **OQ-01:** Which exchange or exchanges will be supported in the first release?
- **OQ-04:** How should the system handle exchange outages, API failures, or market-data failures beyond the approved stale/latency lockout behavior?
- **OQ-05:** What additional implementation details are required for plan resumption beyond the approved rule that missed intervals are not triggered retroactively or immediately upon unpausing, and that the next remaining tranche follows the next applicable 24-hour interval?
- **OQ-07:** Should the app provide local-language audio summaries, as explored in Task 1, or are bilingual text explanations sufficient for the first release?
- **OQ-08:** What exact user-facing definition, calculation details, and historical records should accompany the Signal Accuracy percentage?
- **OQ-09:** What measurable usability, accessibility, and reliability targets should be used beyond the four NFRs proposed above?

**Implementation note:** The global spot-volume ranking source and objective operational definitions of “high-risk” and “illiquid” should be documented before release, without weakening the approved exclusions.

---

## 11. Official Glossary

### Advisory Signal
An Advisory Signal is a trade recommendation delivered via WhatsApp and mobile push notifications containing the asset name, entry price, target profit yield, and risk context (including English and Urdu explanations). Each signal remains valid for exactly 1 minute, after which it automatically expires unless invalidated earlier by a 2.0% price-shift trigger.

### Conservative Exposure
Conservative Exposure covers both capital-allocation limits and asset selection. It limits any single micro-dosing plan to a maximum of 5% of total user capital, split into three approximately 1.67% tranches, with a 3% maximum loss limit. Advisory recommendations are restricted to Bitcoin and Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, provided they meet conservative high-liquidity criteria. High-risk altcoins and illiquid tokens are excluded. Total user capital and available allocation are calculated only from the connected exchange account’s available quote-asset balance; unconnected external wallets are excluded.

### Exchange API Key Permissions
An exchange API key must allow read and trade access and must not allow withdrawals. Keys with withdrawal permissions are rejected, and withdrawals/transfers through the app are disabled.

### High Volatility
Any price movement of more than 5% (upward or downward) within a 1-hour window for a given asset. When triggered, the system temporarily suppresses new buy signals for that asset and displays a “Market Volatility Warning” banner on the dashboard until price movement settles below the threshold.

### Market Volatility Warning
A dashboard banner displayed when an asset moves more than 5% upward or downward within a one-hour window. New buy signals for the affected asset are suppressed until movement settles below the threshold. Active signals for the affected asset are invalidated when the condition triggers.

### Maximum Loss Limit
A decline of more than 3% from the entry/execution price. Such a decline counts as breaching the limit for Signal Accuracy. This definition does not itself require automatic stop-loss execution, automatic closure, or forced sale.

### Micro-Dosing
Breaking an approved trade allocation into three equal tranches (each capped at approximately 1.67% of total capital when using the maximum 5% allocation limit), executed sequentially across fixed 24-hour intervals, with each tranche requiring individual manual authorization.

### Plan Approval
The user's initial confirmation to set up and schedule a three-tranche investment plan with designated parameters, such as the overall capital allocation percentage. This sets the schedule but does not authorize any funds to be traded.

### Plan Cancellation
The user's action to permanently cancel all remaining unexecuted tranches of a plan. Previously executed tranches remain unaffected, and cancellation carries no extra fees or penalties. An order already submitted to the exchange order book before cancellation takes effect may complete.

### Plan Pause
The user's action to temporarily pause upcoming, unexecuted tranches. Executed tranches remain unaffected. An active authorization window is revoked when the pause takes effect.

### Plan Restart or Adjustment
The process of cancelling the active plan's remaining unexecuted tranches and initializing a fresh three-tranche plan using the current available wallet balance, newly selected allocation percentage, and latest market conditions, subject to the 5% maximum allocation cap. Previously executed tranches remain in the portfolio and count toward total user capital.

### Price Shift
A price increase of more than 2.0% for a recommended asset between the time an advisory signal is generated and when the user attempts to approve it. When triggered, the system locks the Buy button, displays a “Price Shift Alert,” and invalidates the original recommendation.

### Price Shift Alert
A system warning displayed when an asset's price increases by more than 2.0% between advisory signal generation and the user's approval attempt. The system locks the Buy button and invalidates the original recommendation.

### Signal Accuracy
The percentage of advisory signals generated over a rolling 30-day period that reach their target profit yield without dropping more than 3% from the entry price. Signals that breach the 3% loss limit do not count as successful, even if the target is later reached. When no signals exist in the period, the result is displayed as “N/A” or an equivalent explanation.

### Signal Expiry
The automatic expiration of an Advisory Signal exactly one minute after it is generated, unless it is invalidated earlier by a Price Shift exceeding 2.0%. An expired or invalidated signal can no longer be used to authorize the associated trade.

### Trade Authorization
The explicit PIN or biometric (Fingerprint/Face ID) verification required from the user before executing each individual tranche order. Verification must complete within the tranche's one-minute authorization window. Approval of an overall plan does not authorize subsequent tranches.

### Tranche
One of three equal portions of an approved micro-dosing plan's total capital allocation, scheduled at fixed 24-hour intervals. Each tranche requires separate Trade Authorization before execution.

---

### Market Data Unavailable
The user-facing message displayed when, during authorization, connected-exchange WebSocket ticker latency exceeds 5 seconds or market data is delayed by more than 15 seconds. The Buy button is locked and the order cannot be authorized while either condition applies.

### PIN Recovery
PIN recovery requires two-factor OTP verification sent to the user’s registered phone or email. Biometric authorization uses native device operating-system procedures such as Face ID or Touch ID.

## 12. Consolidated Edge-Case Register

This register collects the accepted edge cases from Parts 1–4. Requirement-specific criteria above remain the primary detailed specification.

### Signals and notifications

- **E-01:** An expired signal cannot be used to authorize a trade.
- **E-02:** Signal validity is checked at the point of authorization.
- **E-03:** Exactly 2.0% upward movement does not trigger the strict greater-than Price Shift Alert threshold.
- **E-04:** Price Shift applies only to upward increases greater than 2.0%; a downward drop does not trigger that alert. A drop greater than 3% from entry affects Signal Accuracy.
- **E-05:** If one notification channel fails, use the channel that succeeds; avoid continuous retries within the one-minute window. If both fail, do not falsely report success. Keep the signal on the in-app dashboard during its validity window.
- **E-06:** Duplicate notifications must not create duplicate trade authorization or orders.
- **E-07:** Opening a signal after expiry displays “Expired Signal” and a disabled Buy button.
- **E-08:** If the asset crosses the high-volatility threshold while a signal is active, invalidate the signal immediately, lock Buy, and show the warning.
- **E-09:** If Urdu translation fails or times out, dispatch English plus “Detailed Urdu explanation currently unavailable.” Do not delay or cancel the signal.
- **E-10:** Revalidate price and signal validity at authorization; do not rely only on the notification's displayed price.
- **E-11:** Plan Approval does not authorize trades; each tranche needs separate authorization.
- **E-12:** The warning/suppression ends when movement settles below threshold; precise measurement and reset logic require specification.

### Allocation, tranches, and authorization

- **E-13:** Exactly 5% allocation is accepted if other validations pass.
- **E-14:** Allocation greater than 5% is rejected.
- **E-15:** Tranche amounts are fixed at Plan Approval based on the capital balance at setup. Later wallet changes do not recalculate the active plan unless manually adjusted/restarted.
- **E-16:** Round each tranche down to the smallest currency unit; any fractional remainder remains unallocated.
- **E-17:** PIN/biometric verification must complete within one minute. If the response arrives after expiry, reject, expire, and permanently skip the tranche.
- **E-18:** Failed authorization means no execution; retry limits and detailed security behavior remain unspecified.
- **E-19:** Pause/cancel immediately invalidates an active one-minute authorization window. An order already successfully authorized and submitted to the exchange order book may complete.
- **E-20:** After pause/cancel, subsequent unexecuted tranches are locked or deleted according to the action.
- **E-21:** An expired tranche is permanently skipped and never auto-executes later; subsequent tranches still need authorization.
- **E-22:** Restarting after prior execution preserves executed tranches and recalculates the new plan from current balance and conditions.
- **E-23:** Adjust/restart cancels all remaining unexecuted tranches and initializes a fresh three-tranche plan from current wallet balance and market price.
- **E-24:** If wallet funds are insufficient when a tranche activates, skip it, notify via push and WhatsApp, and leave the plan active for the next tranche 24 hours later.
- **E-25:** Restart after cancellation creates a fresh plan using current figures, subject to the 5% cap.
- **E-26:** Duplicate submissions for the same tranche must not create duplicate orders.

### Plan controls

- **E-27:** If PIN/biometric verification completes after Pause, reject/block trade submission to the exchange.
- **E-28:** On resume after a 24-hour interval has passed while paused, the next remaining tranche follows the next applicable 24-hour interval; no missed interval is triggered retroactively or immediately on unpause.
- **E-29:** If cancellation occurs immediately after a tranche is authorized, an order already submitted to the exchange may complete; later tranches are permanently deleted.
- **E-30:** Adjusting mid-cycle terminates the existing plan while preserving executed tranches and creates a fresh three-tranche plan from current percentage and wallet balance.
- **E-31:** UI state locking/debouncing serializes rapid Pause/Resume actions and prevents race conditions, duplicate notifications, and conflicting plan states.

### Volatility, accuracy, and API security

- **E-32:** Exactly 5% movement does not trigger the strict greater-than volatility threshold.
- **E-33:** Repeated volatility threshold crossings keep the warning/suppression active while the condition is met.
- **E-34:** Volatility suppression is specific to the affected asset.
- **E-35:** An active signal for an asset that enters high volatility is invalidated immediately.
- **E-36:** Exact volatility reference price, rolling-window calculation, and reset logic require specification.
- **E-37:** Exactly a 3% drop does not breach a limit defined as more than 3%.
- **E-38:** A signal that breaches the 3% loss limit does not count as successful even if the target is later reached.
- **E-39:** If less than 30 days of history exist, disclose the available history rather than implying a full 30-day record.
- **E-40:** If no signals exist in the period, display N/A or an equivalent explanation rather than 0%.
- **E-41:** The 3% loss limit is a Signal Accuracy criterion and does not imply automatic stop-loss or closure.
- **E-42:** If withdrawal permissions cannot be inspected, reject or keep the API key inactive until they can be verified.
- **E-43:** If withdrawal permissions become enabled after connection, detect the change where supported and suspend trading access until resolved.
- **E-44:** An expired or revoked key must not be reported as an operational exchange connection.
- **E-45:** A read-only key is insufficient for trade execution. Native device OS biometric procedures (such as Face ID or Touch ID) shall be used for biometric authorization. PIN recovery requires two-factor OTP verification sent to the user’s registered phone or email.
- **E-46:** A successful trading connection does not enable withdrawals or transfers through the app.

---

## 13. Cross-Requirement Consistency Notes

1. **Human authorization:** No order may execute solely because a plan was approved or a tranche was scheduled. Every tranche requires successful PIN/biometric authorization.
2. **One-minute boundaries:** Signals and tranche authorization windows expire after exactly one minute. Authentication must complete—not merely begin—within the window.
3. **Price shift:** The alert threshold is an upward price increase strictly greater than 2.0%. Exactly 2.0% does not trigger it.
4. **High volatility:** The threshold is a price movement strictly greater than 5% in either direction within one hour. Suppression applies to the affected asset and invalidates its active signal.
5. **Loss limit:** A drop strictly greater than 3% from entry is a Signal Accuracy breach. It is not an operational stop-loss rule.
6. **Capital cap:** Each plan is limited to 5% of total user capital. Tranches are equal subject to downward rounding to the smallest currency unit.
7. **Plan restart:** Restart/adjustment cancels the old plan's remaining unexecuted tranches, preserves executed tranches, and creates a fresh plan from current figures.
8. **Pause/resume:** Missed intervals are not executed retroactively or immediately on resume; the next remaining tranche follows the next applicable 24-hour interval.
9. **API permissions:** Read and trade access are required; withdrawal permissions are prohibited. The app has no withdrawal/transfer feature.
10. **Provider dependencies:** Notification attempts and delivery reporting must respect channel/provider status. The stated NFR-04 target is measured against provider acceptance, not a guarantee of end-device receipt.
11. **Asset selection:** Recommend Bitcoin and Ethereum, or assets ranked in the top 10 by global 24-hour spot volume, subject to conservative high-liquidity criteria; exclude high-risk altcoins and illiquid tokens. Document the ranking source and objective classification criteria before release.
12. **Market data:** Use the connected exchange real-time WebSocket ticker stream. If latency exceeds 5 seconds or data is delayed by more than 15 seconds during authorization, lock Buy and display “Market Data Unavailable.”
13. **Capital basis:** Use only the connected exchange account’s available quote-asset balance (e.g., USDT/USD) for total user capital and allocation; exclude unconnected external wallets.
14. **Authentication recovery:** Use native OS biometrics; PIN recovery requires two-factor OTP verification to the registered phone or email.
15. **Testing:** Notification provider acceptance is tested over 1,000 dispatches; 100% enforcement is required for one-minute expiry, price-shift lock, 5% cap, and zero withdrawal permissions.
16. **Unresolved implementation details:** Remaining open questions must not be represented as settled design choices.

---

## 14. Review Checklist

- [ ] Confirm all FR-01–FR-14 criteria remain consistent with the accepted decisions.
- [ ] Confirm NFR-01–NFR-04 verification methods and target measurement period.
- [ ] Resolve OQ-01–OQ-09 without changing already-approved behavior unless the team explicitly revises it.
- [ ] Define the supported asset list and objective liquidity criteria.
- [x] Confirm primary market-data source and stale/latency authorization lockout.
- [ ] Define rolling-window price references and volatility reset logic.
- [x] Confirm wallet/capital calculation basis: connected exchange available quote-asset balance only.
- [ ] Define allocation minimum and numeric precision.
- [x] Confirm native OS biometrics and OTP-based PIN recovery.
- [ ] Define any additional biometric fallback details, if needed.
- [ ] Verify all edge cases in integration and security tests.
- [ ] Ensure user-facing performance displays do not imply guaranteed returns or automatic loss protection.

**End of Final PRD.md**

---

## 12. Supplementary Requirements — TA-Provided Additional Requirements

**Source:** Teaching Assistants (Deliverable 2 Demonstration Client Requirements)  
**Status:** TA-Provided Additional Requirements for Deliverable 3  
**Context:** During the Deliverable 2 demonstration, the Teaching Assistants acted as clients and provided three additional functional requirements to be incorporated into the product architecture while strictly preserving the approved FR-01 through FR-14 baseline.

### FR-15 — Personal Digital-Asset Watchlist
**Requirement:** The system shall allow users to create and manage a personal watchlist of eligible digital assets by adding or removing assets.
- **AC-15.1 — Asset Management:** The user shall be able to add eligible digital assets to, or remove assets from, their personal watchlist.
- **AC-15.2 — Market Data Display:** For each asset in the watchlist, the system shall display the latest available market price, the 24-hour percentage price change, and the market-data update time.
- **AC-15.3 — Isolation from Trading:** The watchlist shall not automatically generate trade orders or modify existing investment plans.

### FR-16 — Executed Trade History and CSV Export
**Requirement:** The system shall allow users to view and export their confirmed executed trade history as a CSV file for a user-selected date range.
- **AC-16.1 — Historical Query:** The system shall display confirmed executed trades filtered by a user-selected date range.
- **AC-16.2 — Export Content:** The exported CSV file shall include: asset name, execution date and time, executed quantity, execution price, total transaction amount, and associated investment plan ID.
- **AC-16.3 — Read-Only Guarantee:** The query and export process shall include only confirmed executed trades from the execution ledger and shall not modify existing portfolio or execution records.

### FR-17 — Private Investment Decision Journal
**Requirement:** The system shall allow users to maintain a private investment decision journal by adding, editing, and deleting personal notes associated with individual advisory signals or investment plans.
- **AC-17.1 — Note Management:** The user shall be able to add, edit, and delete personal journal notes.
- **AC-17.2 — Required Fields:** Each note shall contain a title, written explanation, and creation date.
- **AC-17.3 — Isolation from Trading Workflows:** The system shall display notes alongside the associated signal or plan without affecting trade authorization, signal validity, or investment execution.
