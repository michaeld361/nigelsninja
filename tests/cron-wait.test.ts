import assert from "node:assert/strict";
import test from "node:test";
import { CRON_WAIT_MS } from "../lib/cron-wait";

test("the cron waits longer than Node's five-minute fetch silence, and inside the run lock", () => {
  assert.ok(CRON_WAIT_MS > 5 * 60 * 1000);
  assert.ok(CRON_WAIT_MS < 20 * 60 * 1000);
});
