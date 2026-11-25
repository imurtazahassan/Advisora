-- VS-04/05/06: plan lifecycle, individual authorization and simulated execution ledger.
CREATE TABLE IF NOT EXISTS investment_plans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 symbol VARCHAR(32) NOT NULL REFERENCES market_assets(symbol), signal_id UUID REFERENCES advisory_signals(id), quote_asset VARCHAR(16) NOT NULL,
 available_balance NUMERIC(30,12) NOT NULL CHECK (available_balance > 0),
 allocation_pct NUMERIC(6,3) NOT NULL CHECK (allocation_pct > 0 AND allocation_pct <= 5),
 total_allocation NUMERIC(30,12) NOT NULL CHECK (total_allocation > 0),
 tranche_amount NUMERIC(30,12) NOT NULL CHECK (tranche_amount > 0),
 status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','CANCELLED','COMPLETED')),
 approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_user_created ON investment_plans(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS investment_tranches (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plan_id UUID NOT NULL REFERENCES investment_plans(id),
 tranche_number SMALLINT NOT NULL CHECK (tranche_number BETWEEN 1 AND 3),
 amount NUMERIC(30,12) NOT NULL CHECK (amount > 0), scheduled_at TIMESTAMPTZ NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','AUTHORIZATION_OPEN','PAUSED','SKIPPED','CANCELLED','EXECUTED')),
 authorization_expires_at TIMESTAMPTZ, authorization_challenge TEXT, authorization_challenge_id UUID,
 authorized_at TIMESTAMPTZ, executed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(plan_id, tranche_number)
);
CREATE INDEX IF NOT EXISTS idx_tranches_due ON investment_tranches(status, scheduled_at);
CREATE TABLE IF NOT EXISTS simulated_trades (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), plan_id UUID NOT NULL REFERENCES investment_plans(id),
 tranche_id UUID NOT NULL UNIQUE REFERENCES investment_tranches(id), symbol VARCHAR(32) NOT NULL,
 quantity NUMERIC(30,12) NOT NULL CHECK (quantity > 0), price NUMERIC(30,12) NOT NULL CHECK (price > 0),
 quote_amount NUMERIC(30,12) NOT NULL CHECK (quote_amount > 0), executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 execution_mode VARCHAR(24) NOT NULL DEFAULT 'SIMULATED', status VARCHAR(16) NOT NULL DEFAULT 'CONFIRMED'
);
CREATE TABLE IF NOT EXISTS tranche_authorization_challenges (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), tranche_id UUID NOT NULL REFERENCES investment_tranches(id),
 device_id UUID NOT NULL REFERENCES user_devices(id), challenge TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tranche_auth_challenges_expiry ON tranche_authorization_challenges(expires_at);

-- Executed-trade ledger is append-only.
CREATE OR REPLACE FUNCTION reject_simulated_trade_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Executed trade ledger is append-only'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_simulated_trades_no_update ON simulated_trades;
CREATE TRIGGER trg_simulated_trades_no_update BEFORE UPDATE OR DELETE ON simulated_trades FOR EACH ROW EXECUTE FUNCTION reject_simulated_trade_mutation();
