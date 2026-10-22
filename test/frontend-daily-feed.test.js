const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
const dashboardSource = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createDashboard(initialNow) {
  const values = new Map();
  let currentNow = initialNow;
  const RealDate = Date;

  class MockDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [currentNow]));
    }
  }

  const localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  const context = {
    console,
    Date: MockDate,
    localStorage,
    window: {
      addEventListener() {},
      setInterval() {},
    },
    document: {},
    __applied: [],
  };
  vm.createContext(context);
  vm.runInContext(dashboardSource, context);

  return {
    context,
    values,
    setNow(value) {
      currentNow = value;
    },
  };
}

function dailyFeed(date) {
  return {
    ok: true,
    ticket_date: date,
    api_status: { provider: "Test Feed", custom_key_message: "Saved" },
    matches: [
      {
        id: "completed-match",
        sport: "football",
        kickoff: `${date}T10:00:00Z`,
      },
    ],
    tickets: [{ id: "saved-ticket", legs: [] }],
  };
}

test("a normal dashboard reload restores the saved feed without another request", async () => {
  const { context } = createDashboard("2026-10-22T08:00:00Z");
  context.__feed = dailyFeed("2026-10-22");
  vm.runInContext("saveDailyFeedSnapshot(__feed)", context);

  let networkRequests = 0;
  context.fetch = async () => {
    networkRequests += 1;
    throw new Error("The saved feed should not call the network");
  };
  vm.runInContext(
    "applyFeedData = (data, fromSnapshot) => __applied.push({ data, fromSnapshot })",
    context
  );

  await vm.runInContext("fetchLiveFeed(false)", context);

  assert.equal(networkRequests, 0);
  assert.equal(context.__applied.length, 1);
  assert.equal(context.__applied[0].fromSnapshot, true);
  assert.equal(context.__applied[0].data.tickets[0].id, "saved-ticket");
});

test("the saved feed expires when the WAT calendar day changes", () => {
  const dashboard = createDashboard("2026-10-22T08:00:00Z");
  dashboard.context.__feed = dailyFeed("2026-10-22");
  vm.runInContext("saveDailyFeedSnapshot(__feed)", dashboard.context);

  dashboard.setNow("2026-10-23T08:00:00Z");

  assert.equal(vm.runInContext("readDailyFeedSnapshot()", dashboard.context), null);
  assert.equal(dashboard.values.has("jay_alpha_daily_feed_v1"), false);
});

test("the selected daily slip is restored until WAT rollover", () => {
  const dashboard = createDashboard("2026-10-22T08:00:00Z");
  dashboard.context.__selectedLegs = [
    { match_id: "ticket-two-leg", market_label: "Over 1.5 Goals" },
  ];
  vm.runInContext(
    "ACTIVE_FEED_DATE = getWatDateStr(); CURRENT_SLIP = __selectedLegs; saveDailySlip(); CURRENT_SLIP = [];",
    dashboard.context
  );

  const restored = vm.runInContext("readDailySlip()", dashboard.context);
  assert.equal(JSON.parse(JSON.stringify(restored))[0].match_id, "ticket-two-leg");

  dashboard.setNow("2026-10-23T08:00:00Z");
  assert.equal(vm.runInContext("readDailySlip()", dashboard.context), null);
});
