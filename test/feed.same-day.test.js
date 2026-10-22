const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getWatDateStr,
  generateCurated2OddsTickets,
} = require("../api/feed");

const THURSDAY_WAT = "2026-10-22";

function makeFootballMatch(id, kickoff, alphaScore = 70) {
  return {
    id,
    sport: "football",
    sport_label: "Football",
    league: "Same-Day Test League",
    kickoff,
    home_team: `${id} Home`,
    away_team: `${id} Away`,
    odds_source: "DraftKings",
    markets: [
      {
        code: "OVER_1_5",
        label: "Over 1.5 Goals",
        category: "Goals Safe",
        true_prob: 72,
        sporty_odd: 1.50,
        global_odd: 1.55,
        rationale: "Same-day regression fixture",
        alpha_score: alphaScore,
      },
    ],
  };
}

function generate(matches) {
  return generateCurated2OddsTickets(matches, "hybrid", 2.04, 2.42, THURSDAY_WAT);
}

test("getWatDateStr uses Africa/Lagos rather than the UTC calendar date", () => {
  assert.equal(getWatDateStr("2026-10-22T22:59:59Z"), "2026-10-22");
  assert.equal(getWatDateStr("2026-10-22T23:00:00Z"), "2026-10-23");
  assert.equal(getWatDateStr("2026-10-23T00:30:00+01:00"), "2026-10-23");
});

test("curated tickets exclude higher-ranked legs from other WAT dates", () => {
  const tickets = generate([
    makeFootballMatch("thursday-a", "2026-10-22T10:00:00Z", 40),
    makeFootballMatch("friday-high-score", "2026-10-23T10:00:00Z", 200),
    makeFootballMatch("thursday-b", "2026-10-22T12:00:00Z", 41),
    makeFootballMatch("saturday-high-score", "2026-10-24T12:00:00Z", 190),
    makeFootballMatch("friday-at-wat-midnight", "2026-10-22T23:30:00Z", 180),
    makeFootballMatch("missing-kickoff", null, 170),
  ]);

  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].wat_date, THURSDAY_WAT);
  assert.deepEqual(
    tickets[0].legs.map(leg => leg.match_id).sort(),
    ["thursday-a", "thursday-b"]
  );

  for (const ticket of tickets) {
    for (const leg of ticket.legs) {
      assert.equal(leg.wat_date, THURSDAY_WAT);
      assert.equal(getWatDateStr(leg.kickoff), THURSDAY_WAT);
    }
  }
});

test("no ticket is built when only future-dated matches qualify", () => {
  const tickets = generate([
    makeFootballMatch("friday-a", "2026-10-23T10:00:00Z"),
    makeFootballMatch("friday-b", "2026-10-23T12:00:00Z"),
  ]);

  assert.deepEqual(tickets, []);
});
