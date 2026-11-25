# VS-03 — Decisions Required Before Enabling Signal Generation

These items are not settled by the supplied baseline. Do not silently select values.

1. **Target profit yield:** Numeric target yield and its calculation/rounding method. FR-01 requires it in every signal, but the PRD does not specify a value.
2. **Volatility reference:** Exact one-hour comparison/reference price, treatment of sparse/missing ticks, and reset condition. PRD E-36 explicitly leaves these for specification.
3. **Conservative asset eligibility:** Authoritative global 24-hour spot-volume ranking source and objective high-liquidity/high-risk classification. PRD requires these to be documented before release; VS-02 currently returns `PENDING_POLICY`.
4. **Urdu translation fallback operationalization:** Approved source for detailed Urdu translation and timeout/failure handling if dynamic translation is later used. The standard fallback wording is specified in FR-03.

Until these decisions are approved and VS-02 eligibility can return `ELIGIBLE`, signal generation must remain disabled.
