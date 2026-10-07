import assert from "node:assert/strict";
import test from "node:test";
import { emptyStore } from "../lib/store";
import type { FitAssessment, Job } from "../lib/types";
import { buildMorningEmail } from "../pipeline/morning-email";
import { nextLondonSix } from "../pipeline/morning-schedule";

const now = new Date("2026-10-07T18:35:00.000Z");

test("the morning email keeps the last day, flags a strong fit, and greys a skip", () => {
  const store = emptyStore();
  store.jobs = [
    job("old", "2026-10-05T10:00:00.000Z", "new"),
    job("strong", "2026-10-07T12:00:00.000Z", "new", "Data Protection Officer", "Everest"),
    job("listed", "2026-10-07T13:00:00.000Z", "new", "Data Privacy Manager", "Lex Dinamica"),
    job("aside", "2026-10-07T14:00:00.000Z", "skipped", "Data Protection Officer", "Barclay Simpson"),
    job("quiet", "2026-10-07T15:00:00.000Z", "new", "Compliance Manager", "Semble"),
    job("dropped", "2026-10-07T16:00:00.000Z", "filtered"),
  ];
  store.fitAssessments = [
    fit("strong", 95),
    fit("listed", 80),
    fit("aside", 93),
    fit("quiet", 70),
  ];
  store.applyPacks = [
    { id: "apply-listed", jobId: "listed", state: "ready", letterId: null, howToApply: null, contact: null, companyNote: null, companySources: [], lookingFor: [], liveResearch: false, model: "", error: null, createdAt: "2026-10-07T13:30:00.000Z", readyAt: null },
  ];
  store.runs = [
    run("2026-10-07T15:35:00.000Z", 50, 1, false),
    run("2026-10-07T11:35:00.000Z", 34, 7, false),
    run("2026-10-06T10:00:00.000Z", 100, 9, false),
    run("2026-10-07T07:37:00.000Z", 7, 12, true),
  ];
  const email = buildMorningEmail(store, now, "https://example.test");
  assert.equal(email.subject, "Wednesday. Your roles from the last day");
  assert.match(email.html, /Wednesday/);
  assert.match(email.html, /Nigel/);
  assert.match(email.html, /nigelsninja/);
  assert.match(email.html, /#0E0F11/);
  assert.match(email.html, /#FF6B5B/);
  assert.equal(email.html.includes("Old Role"), false);
  assert.equal(email.html.includes("Filtered Out"), false);
  assert.match(email.html, /https:\/\/example\.test\/jobs\/strong/);
  assert.match(email.html, /Strong fit/);
  assert.match(email.html, /On your apply list/);
  assert.match(email.html, /You skipped this/);
  assert.match(email.html, /color: #9a938c/);
  assert.equal(email.html.includes("127.0.0.1"), false);
  assert.deepEqual(email.stats, { searched: 84, found: 8, fresh: 4, applied: 1, skipped: 1 });
});

test("the next morning send is 6:00 London", () => {
  assert.equal(nextLondonSix(new Date("2026-10-07T18:35:00.000Z")).toISOString(), "2026-10-08T05:00:00.000Z");
  assert.equal(nextLondonSix(new Date("2026-01-15T12:00:00.000Z")).toISOString(), "2026-01-16T06:00:00.000Z");
  assert.equal(nextLondonSix(new Date("2026-10-08T04:30:00.000Z")).toISOString(), "2026-10-08T05:00:00.000Z");
});

function job(id: string, firstSeenAt: string, status: Job["status"], title = "Old Role", company = "Old Co"): Job {
  return {
    id,
    dedupeKey: id,
    applicationKey: id,
    title: status === "filtered" ? "Filtered Out" : title,
    company,
    location: "London",
    workPattern: "hybrid",
    hybridDays: 2,
    europeRemote: false,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    currency: null,
    contractType: "permanent",
    postedAt: firstSeenAt.slice(0, 10),
    closesAt: null,
    deadline: null,
    sources: [],
    applyUrl: null,
    descriptionText: "",
    status,
    statusChangedAt: firstSeenAt,
    firstSeenAt,
    filteredReason: status === "filtered" ? "filtered" : null,
    letterNotes: "",
    privateNote: "",
    demo: false,
  };
}

function fit(jobId: string, score: number): FitAssessment {
  return {
    id: `fit-${jobId}`,
    jobId,
    model: "local",
    promptVersion: "1",
    score,
    summary: "",
    matches: [],
    gaps: [],
    blockers: [],
    flags: [],
    seniorityFit: "",
    locationFit: "",
    salaryNote: "",
    createdAt: "2026-10-07T12:00:00.000Z",
  };
}

function run(finishedAt: string, fetched: number, found: number, demo: boolean) {
  return {
    id: finishedAt,
    startedAt: finishedAt,
    finishedAt,
    trigger: "manual" as const,
    by: "test",
    lookbackHours: 24,
    counts: {
      linkedin: { fetched, new: found, filtered: 0, scored: found, letters: 0, duplicates: 0, alreadyApplied: 0, practisingQualification: 0, demo, error: null },
      reed: { fetched: 0, new: 0, filtered: 0, scored: 0, letters: 0, duplicates: 0, alreadyApplied: 0, practisingQualification: 0, demo: false, error: null },
      jsearch: { fetched: 0, new: 0, filtered: 0, scored: 0, letters: 0, duplicates: 0, alreadyApplied: 0, practisingQualification: 0, demo: false, error: null },
    },
    totals: { fetched, new: found, filtered: 0, scored: found, letters: 0, worthALook: found },
    errors: [],
    warnings: [],
    estimatedCostUsd: 0,
    lettersSkippedReason: null,
    digestHtml: null,
    digestSent: false,
  };
}
