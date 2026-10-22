const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getWatDateStr,
  fetchEspnLiveMatches,
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

test("completed fixtures remain for their WAT day and expire on the next day", async () => {
  const originalFetch = global.fetch;
  const completedStatus = { type: { state: "post", description: "Full Time" } };

  global.fetch = async url => {
    let data = { events: [] };

    if (url.includes("/soccer/uefa.champions/") && url.endsWith("dates=20261022")) {
      data = {
        events: [
          {
            id: "completed-football",
            date: "2026-10-22T18:00:00Z",
            competitions: [
              {
                status: completedStatus,
                competitors: [
                  { homeAway: "home", team: { shortDisplayName: "Home FC" } },
                  { homeAway: "away", team: { shortDisplayName: "Away FC" } },
                ],
                odds: [],
              },
            ],
          },
        ],
      };
    } else if (url.includes("/tennis/wta/")) {
      data = {
        events: [
          {
            name: "WTA Daily Test",
            groupings: [
              {
                grouping: { displayName: "Women's Singles" },
                competitions: [
                  {
                    id: "completed-tennis",
                    date: "2026-10-22T12:00:00Z",
                    status: completedStatus,
                    competitors: [
                      { athlete: { displayName: "Player One" }, curatedRank: { current: 1 } },
                      { athlete: { displayName: "Player Two" }, curatedRank: { current: 2 } },
                    ],
                  },
                  {
                    id: "previous-day-tennis",
                    date: "2026-10-21T12:00:00Z",
                    status: completedStatus,
                    competitors: [
                      { athlete: { displayName: "Old Player One" }, curatedRank: { current: 3 } },
                      { athlete: { displayName: "Old Player Two" }, curatedRank: { current: 4 } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    return { ok: true, json: async () => data };
  };

  try {
    const matches = await fetchEspnLiveMatches(0.025, new Date("2026-10-22T08:00:00Z"));
    const football = matches.find(match => match.id === "soc_completed-football");
    const tennis = matches.find(match => match.id === "ten_completed-tennis");

    assert.equal(football.status, "Full Time");
    assert.equal(football.kickoff, "2026-10-22T18:00:00Z");
    assert.equal(tennis.status, "Full Time");
    assert.equal(tennis.kickoff, "2026-10-22T12:00:00Z");
    assert.equal(matches.some(match => match.id === "ten_previous-day-tennis"), false);
  } finally {
    global.fetch = originalFetch;
  }
});
