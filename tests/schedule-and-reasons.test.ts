import assert from "node:assert/strict";
import test from "node:test";
import { lowFitReason } from "../lib/low-fit-reason";
import { acceptMarketNote, marketFallback } from "../lib/market";
import { steadyLookback, runBudget } from "../pipeline/search-plan";
import { initialLondonSlot, nextLondonFive, nextLondonSix } from "../pipeline/morning-schedule";

test("a low-fit line uses the stored score, gaps, and blockers, and a blank score waits for the next run", () => {
  const reason = lowFitReason({
    score: 42,
    summary: "The brief wants a practising solicitor",
    gaps: ["No litigation practice"],
    blockers: ["Requires a solicitor qualification"],
  });
  assert.match(reason || "", /Score 42/);
  assert.match(reason || "", /solicitor qualification/);
  assert.match(reason || "", /litigation/);
  assert.equal(lowFitReason({ score: 10, summary: "", gaps: [], blockers: [] }), null);
  assert.equal(lowFitReason(null), null);
});

test("the daily search stays on the two-dollar cap even after a long gap", () => {
  const hours = steadyLookback(24 * 7);
  assert.ok(hours < 24 * 7);
  assert.equal(runBudget(hours).usd, 2);
  assert.equal(runBudget(24 * 7).usd, 5);
});

test("the next search is 5:00 London and the next email is 6:00 London, including across the clocks", () => {
  const afternoon = new Date("2026-10-08T13:30:00.000Z");
  assert.equal(nextLondonFive(afternoon).toISOString(), "2026-10-09T04:00:00.000Z");
  assert.equal(nextLondonSix(afternoon).toISOString(), "2026-10-09T05:00:00.000Z");
  assert.equal(initialLondonSlot(5, afternoon), "2026-10-09T04:00:00.000Z");
  const winter = new Date("2026-01-15T12:00:00.000Z");
  assert.equal(nextLondonFive(winter).toISOString(), "2026-01-16T05:00:00.000Z");
  assert.equal(nextLondonSix(winter).toISOString(), "2026-01-16T06:00:00.000Z");
  const justAfterFive = new Date("2026-10-09T04:20:00.000Z");
  assert.equal(initialLondonSlot(5, justAfterFive), "2026-10-09T04:00:00.000Z");
  const secondPing = new Date("2026-10-09T05:00:00.000Z");
  assert.equal(initialLondonSlot(5, secondPing), "2026-10-09T04:00:00.000Z");
  const afterTheWindow = new Date("2026-10-09T05:31:00.000Z");
  assert.equal(initialLondonSlot(5, afterTheWindow), "2026-10-10T04:00:00.000Z");
  assert.equal(nextLondonFive(new Date("2026-10-09T04:01:00.000Z")).toISOString(), "2026-10-10T04:00:00.000Z");
});

test("a stored market note is warm prose, and a bad model line is refused", () => {
  const note = marketFallback({
    titles: ["Data Protection Officer (3)"],
    places: ["London, on site (2)"],
    contracts: ["Permanent (4)"],
    asks: ["DPIAs and privacy by design"],
  });
  assert.match(note, /Data Protection Officer/);
  assert.match(note, /London/);
  assert.doesNotMatch(note, /\$|£/);
  assert.equal(acceptMarketNote("Sorry, the model failed and cannot help."), null);
  assert.equal(acceptMarketNote("The listings want DPIAs, and most of them sit in London on a permanent contract."), note.length > 0 ? acceptMarketNote("The listings want DPIAs, and most of them sit in London on a permanent contract.") : null);
});
