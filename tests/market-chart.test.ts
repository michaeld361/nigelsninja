import assert from "node:assert/strict";
import test from "node:test";
import { axisTicks, chartX } from "../lib/market";

test("a crowded chart keeps a few short dates and does not repeat searched", () => {
  const points = Array.from({ length: 12 }, (_, index) => ({
    at: new Date(Date.UTC(2026, 9, 1 + index, 9, 27)).toISOString(),
  }));
  const ticks = axisTicks(points);
  assert.ok(ticks.length >= 2);
  assert.ok(ticks.length <= 4);
  assert.equal(ticks.some((tick) => /searched/i.test(tick.label)), false);
  assert.equal(ticks.some((tick) => /October/.test(tick.label)), false);
  assert.match(ticks[0].label, /^\d{1,2} \w{3}$/);
  for (let index = 1; index < ticks.length; index += 1) {
    const gap = chartX(ticks[index].index, points.length) - chartX(ticks[index - 1].index, points.length);
    assert.ok(gap >= 120, `tick gap ${gap}`);
  }
});

test("searches on one day are labelled by time, not a repeated date", () => {
  const points = ["10:27", "11:27", "12:27", "13:27", "14:27"].map((clock) => ({
    at: `2026-10-08T${clock}:00.000Z`,
  }));
  const ticks = axisTicks(points);
  assert.ok(ticks.length <= 4);
  assert.equal(ticks.every((tick) => /^\d{2}:\d{2}$/.test(tick.label)), true);
  assert.equal(new Set(ticks.map((tick) => tick.label)).size, ticks.length);
});
