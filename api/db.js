// Vercel Serverless Function: /api/db
// Connects to Neon Serverless Postgres (process.env.DATABASE_URL)
// Automatically initializes schema tables on first run and syncs API keys + 7-Day Bankroll Ledger.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(200).json({
      ok: true,
      neon_connected: false,
      message: "Running in Browser LocalStorage Mode (Add DATABASE_URL from Neon.tech in Vercel to enable cloud Postgres sync)."
    });
  }

  try {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(dbUrl);

    // Auto-migrate tables if not yet created
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        profile_key VARCHAR(64) PRIMARY KEY,
        the_odds_api_key TEXT,
        sporting_odds_api_key TEXT,
        sportybet_haircut NUMERIC(5,4) DEFAULT 0.0250,
        min_target_odds NUMERIC(5,2) DEFAULT 2.06,
        week_ledger_json TEXT DEFAULT '["won","won","lost","won","won","won","pending"]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    if (req.method === "GET") {
      const rows = await sql`SELECT * FROM user_settings WHERE profile_key = 'jay_default' LIMIT 1`;
      return res.status(200).json({
        ok: true,
        neon_connected: true,
        settings: rows[0] || null
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const oddsKey = body.the_odds_api_key || "";
      const sportingKey = body.sporting_odds_api_key || "";
      const haircut = parseFloat(body.sportybet_haircut || 0.025);
      const minTarget = parseFloat(body.min_target_odds || 2.06);
      const ledgerJson = JSON.stringify(body.week_ledger || ["won","won","lost","won","won","won","pending"]);

      await sql`
        INSERT INTO user_settings (profile_key, the_odds_api_key, sporting_odds_api_key, sportybet_haircut, min_target_odds, week_ledger_json, updated_at)
        VALUES ('jay_default', ${oddsKey}, ${sportingKey}, ${haircut}, ${minTarget}, ${ledgerJson}, NOW())
        ON CONFLICT (profile_key) DO UPDATE SET
          the_odds_api_key = EXCLUDED.the_odds_api_key,
          sporting_odds_api_key = EXCLUDED.sporting_odds_api_key,
          sportybet_haircut = EXCLUDED.sportybet_haircut,
          min_target_odds = EXCLUDED.min_target_odds,
          week_ledger_json = EXCLUDED.week_ledger_json,
          updated_at = NOW();
      `;
      return res.status(200).json({ ok: true, neon_connected: true, saved: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      neon_connected: false,
      error: err.message
    });
  }
};
