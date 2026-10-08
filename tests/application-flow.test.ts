import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_STAGES, STAGE_LABEL, isApplicationStage } from "../lib/stages";
import { alreadyAppliedMatch } from "../pipeline/applied";

test("application stages use only the five names, and Applied is the start", () => {
  assert.deepEqual(
    APPLICATION_STAGES.map((stage) => STAGE_LABEL[stage]),
    ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"],
  );
  assert.equal(STAGE_LABEL.applied, "Applied");
  assert.equal(isApplicationStage("applied"), true);
  assert.equal(isApplicationStage("new"), false);
  assert.equal(isApplicationStage("shortlisted"), false);
});

test("a later stage still counts as already applied", () => {
  const now = new Date("2026-10-08T10:00:00.000Z").getTime();
  const jobs = [
    { id: "job-1", status: "interview", applicationKey: "acme|head of privacy", statusChangedAt: "2026-10-01T00:00:00.000Z" },
    { id: "job-2", status: "withdrawn", applicationKey: "beta|privacy manager", statusChangedAt: "2026-09-01T00:00:00.000Z" },
  ];
  assert.equal(alreadyAppliedMatch({ postingId: "job-1", applicationKey: "other|other", now, jobs, applications: [] }), true);
  assert.equal(alreadyAppliedMatch({ postingId: "job-9", applicationKey: "beta|privacy manager", now, jobs, applications: [] }), true);
  assert.equal(alreadyAppliedMatch({ postingId: "job-9", applicationKey: "acme|head of privacy", now, jobs: [{ ...jobs[0], status: "new" }], applications: [] }), false);
});
