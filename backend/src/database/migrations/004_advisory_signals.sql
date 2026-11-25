-- VS-03 foundation. This table stores advisory history only; it cannot authorize or execute orders.
CREATE TABLE IF NOT EXISTS advisory_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL REFERENCES market_assets(symbol),
  asset_name VARCHAR(100) NOT NULL,
  entry_price NUMERIC(30, 12) NOT NULL CHECK (entry_price > 0),
  target_profit_yield_pct NUMERIC(8, 4) NOT NULL CHECK (target_profit_yield_pct > 0),
  risk_context TEXT NOT NULL,
  explanation_en TEXT NOT NULL,
  explanation_ur TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  outcome VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (outcome IN ('PENDING', 'TARGET_REACHED', 'LOSS_LIMIT_BREACHED', 'EXPIRED_UNEVALUATED')),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT advisory_signal_expiry_exact CHECK (expires_at = generated_at + INTERVAL '60 seconds')
);
CREATE INDEX IF NOT EXISTS idx_advisory_signals_user_generated ON advisory_signals(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisory_signals_active ON advisory_signals(symbol, expires_at) WHERE invalidated_at IS NULL;
