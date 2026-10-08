import assert from "node:assert/strict";
import test from "node:test";
import { CRON_DEADLINE_MS, CRON_HTTP_MS, RUN_LOCK_MS } from "../lib/cron-wait";

test("a LinkedIn cron call stays inside Node's five-minute silence, and the search may run longer", () => {
  assert.ok(CRON_HTTP_MS < 5 * 60 * 1000);
  assert.ok(CRON_DEADLINE_MS > 30 * 60 * 1000);
  assert.ok(CRON_DEADLINE_MS < RUN_LOCK_MS);
});
