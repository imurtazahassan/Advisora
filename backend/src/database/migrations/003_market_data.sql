CREATE TABLE IF NOT EXISTS market_assets (
  symbol VARCHAR(32) PRIMARY KEY,
  base_asset VARCHAR(16) NOT NULL,
  quote_asset VARCHAR(16) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_ticks (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL REFERENCES market_assets(symbol),
  price NUMERIC(30, 12) NOT NULL CHECK (price > 0),
  provider_event_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  provider_latency_ms INTEGER NOT NULL CHECK (provider_latency_ms >= 0),
  source VARCHAR(32) NOT NULL CHECK (source IN ('SIMULATED', 'TEST_FIXTURE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_market_ticks_symbol_received ON market_ticks(symbol, received_at DESC);

INSERT INTO market_assets (symbol, base_asset, quote_asset, display_name)
VALUES ('BTC/USDT', 'BTC', 'USDT', 'Bitcoin'), ('ETH/USDT', 'ETH', 'USDT', 'Ethereum')
ON CONFLICT (symbol) DO NOTHING;
