import assert from "node:assert/strict";
import test from "node:test";
import { JOBS_VISIT_LINES, pickJobsVisitLine } from "../lib/jobs-visit-lines";

test("each visit can land on a different warm line, and none of them list the jobs", () => {
  assert.equal(JOBS_VISIT_LINES.length, 10);
  const seen = new Set<string>();
  for (let index = 0; index < JOBS_VISIT_LINES.length; index += 1) {
    const line = pickJobsVisitLine(() => index / JOBS_VISIT_LINES.length);
    seen.add(line);
    assert.equal(line, JOBS_VISIT_LINES[index]);
    assert.doesNotMatch(line, /hiring|\$|\d|we're|role|london|ashford|data protection/i);
  }
  assert.equal(seen.size, JOBS_VISIT_LINES.length);
  assert.equal(pickJobsVisitLine(() => 0.999), JOBS_VISIT_LINES.at(-1));
});
