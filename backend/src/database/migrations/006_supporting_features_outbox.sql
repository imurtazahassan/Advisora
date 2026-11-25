-- VS-07/08: transactional notification outbox, watchlists, and private journal.
CREATE TABLE IF NOT EXISTS notification_outbox (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 event_type VARCHAR(64) NOT NULL, channel VARCHAR(24) NOT NULL CHECK (channel IN ('IN_APP','WHATSAPP','PUSH')),
 payload JSONB NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','FAILED')),
 provider_message_id TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_user ON notification_outbox(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS user_watchlist (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, symbol VARCHAR(32) NOT NULL REFERENCES market_assets(symbol), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,symbol)
);
CREATE TABLE IF NOT EXISTS investment_journal (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 signal_id UUID REFERENCES advisory_signals(id) ON DELETE SET NULL, plan_id UUID REFERENCES investment_plans(id) ON DELETE SET NULL,
 title VARCHAR(160) NOT NULL, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_user_updated ON investment_journal(user_id,updated_at DESC);
