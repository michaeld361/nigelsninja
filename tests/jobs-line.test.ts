import assert from "node:assert/strict";
import test from "node:test";
import { acceptJobsLine, jobsFallbackLine } from "../lib/jobs-line";

const roles = [
  { id: "a", title: "Data Protection Officer", location: "London" },
  { id: "b", title: "Data Privacy Manager", location: "London" },
  { id: "c", title: "Head of Privacy", location: "Remote, UK" },
];

test("the jobs line names the real count and stays put for the same list", () => {
  const first = jobsFallbackLine(roles);
  const second = jobsFallbackLine(roles);
  assert.equal(first, second);
  assert.match(first, /3/);
  assert.equal(acceptJobsLine(first, 3), true);
  assert.equal(jobsFallbackLine([]), "Nothing on the list just now.");
});

test("a different list can take a different line, and a bad model line is refused", () => {
  const other = jobsFallbackLine([{ id: "z", title: "Privacy Manager", location: "Manchester" }]);
  assert.match(other, /1/);
  assert.match(other, /Privacy Manager/);
  assert.equal(acceptJobsLine("Sorry, the model failed", 3), false);
  assert.equal(acceptJobsLine("A few roles are waiting.", 3), false);
  assert.equal(acceptJobsLine("3 privacy roles, mostly in London.", 3), true);
});
