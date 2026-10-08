import assert from "node:assert/strict";
import test from "node:test";
import { clearDemoSelections } from "../lib/clear-selections";
import { emptyStore } from "../lib/store";
import type { Job } from "../lib/types";

test("demo selections return to Jobs and the test notes go", () => {
  const store = emptyStore();
  store.profile.cvText = "The CV stays";
  store.settings.homePostcode = "N22 5QA";
  store.jobs.push(job("applied-role", "applied"), job("skipped-role", "skipped"), job("chosen-role", "new"), job("kept-role", "low_fit"));
  store.applyPacks.push({
    id: "pack-1",
    jobId: "chosen-role",
    state: "ready",
    letterId: "letter-1",
    howToApply: null,
    contact: null,
    companyNote: null,
    companySources: [],
    lookingFor: [],
    liveResearch: false,
    model: "",
    error: null,
    createdAt: "2026-10-08T10:00:00.000Z",
    readyAt: "2026-10-08T10:00:00.000Z",
  });
  store.applications.push({
    id: "app-1",
    jobId: "applied-role",
    company: "Lex Dinamica",
    title: "Data Privacy Manager",
    applicationKey: "lex|applied-role",
    appliedAt: "2026-10-08T10:00:00.000Z",
    outcome: "Applied",
    outcomeAt: "2026-10-08T10:00:00.000Z",
  });
  store.notes.push(
    { id: "n1", text: "testing", createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T09:00:00.000Z" },
    { id: "n2", text: "Prefer hybrid London", createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T09:00:00.000Z" },
  );
  store.learnings.push(
    {
      id: "l1",
      jobId: "applied-role",
      company: "Lex Dinamica",
      title: "Data Privacy Manager",
      reason: "rejection test",
      at: "2026-10-08T09:00:00.000Z",
      updatedAt: "2026-10-08T09:00:00.000Z",
    },
    {
      id: "l2",
      jobId: "other",
      company: "Acme",
      title: "DPO",
      reason: "They wanted a practising solicitor",
      at: "2026-10-01T09:00:00.000Z",
      updatedAt: "2026-10-01T09:00:00.000Z",
    },
  );

  const result = clearDemoSelections(store, "2026-10-08T12:00:00.000Z");
  assert.equal(store.jobs.length, 4);
  assert.equal(store.jobs.find((item) => item.id === "kept-role")?.status, "low_fit");
  assert.equal(store.jobs.filter((item) => item.status === "applied" || item.status === "skipped").length, 0);
  assert.deepEqual(
    store.jobs.filter((item) => item.id !== "kept-role").map((item) => item.status),
    ["new", "new", "new"],
  );
  assert.equal(store.applyPacks.length, 0);
  assert.equal(store.applications.length, 0);
  assert.deepEqual(store.notes.map((note) => note.text), ["Prefer hybrid London"]);
  assert.deepEqual(store.learnings.map((item) => item.reason), ["They wanted a practising solicitor"]);
  assert.equal(store.profile.cvText, "The CV stays");
  assert.equal(store.settings.homePostcode, "N22 5QA");
  assert.equal(result.returned, 3);
  assert.equal(result.notes, 1);
  assert.equal(result.learnings, 1);
});

function job(id: string, status: Job["status"]): Job {
  return {
    id,
    dedupeKey: id,
    applicationKey: `lex|${id}`,
    title: "Data Privacy Manager",
    company: "Lex Dinamica",
    location: "London",
    workPattern: "hybrid",
    hybridDays: 2,
    europeRemote: false,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    currency: null,
    contractType: "permanent",
    postedAt: "2026-10-01T00:00:00.000Z",
    closesAt: null,
    deadline: null,
    sources: [{ source: "linkedin", url: "https://uk.linkedin.com/jobs/view/1", publisher: "LinkedIn", demo: false }],
    applyUrl: "https://uk.linkedin.com/jobs/view/1",
    descriptionText: "Salary £70,000.",
    status,
    statusChangedAt: "2026-10-01T00:00:00.000Z",
    firstSeenAt: "2026-10-01T00:00:00.000Z",
    filteredReason: null,
    letterNotes: "",
    privateNote: "",
    demo: false,
  };
}
