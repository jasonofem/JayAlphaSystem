-- Neon Serverless Postgres Schema for Jay Alpha System
-- Note: /api/db.js also runs this automatically on first request!

CREATE TABLE IF NOT EXISTS user_settings (
  profile_key VARCHAR(64) PRIMARY KEY,
  the_odds_api_key TEXT,
  sporting_odds_api_key TEXT,
  sportybet_haircut NUMERIC(5,4) DEFAULT 0.0250,
  min_target_odds NUMERIC(5,2) DEFAULT 2.06,
  week_ledger_json TEXT DEFAULT '["won","won","lost","won","won","won","pending"]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
