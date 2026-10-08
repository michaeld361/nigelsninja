import assert from "node:assert/strict";
import test from "node:test";
import { defaultSettings } from "../lib/defaults";
import type { Job, Store } from "../lib/types";
import { alreadyAppliedMatch } from "../pipeline/applied";
import { lookbackSince } from "../pipeline/lookback";
import { prefilterJob } from "../pipeline/prefilter";
import { replayFiltered } from "../pipeline/replay-filter";
import { closedBlockers } from "../pipeline/score";
import { scoreLocal } from "../pipeline/score";
import { chunkBudget, chunkPhrases, rowCapNotes, runBudget } from "../pipeline/search-plan";

const settings = defaultSettings();

test("a domain title reaches the scorer, and obvious noise does not", () => {
  const keep = [
    "Privacy Programme Manager",
    "Data Protection Lead",
    "Group DPO",
    "Privacy & Data Governance Manager",
    "Head of Information Governance",
    "Data Protection Business Partner",
    "Compliance Manager",
    "Data Protection",
    "Privacy Adviser",
    "Privacy Consultant",
    "Deputy Head of Data Protection",
    "Chief Privacy Officer",
  ];
  for (const title of keep) {
    const result = prefilterJob({ title, location: "London", workPattern: "hybrid", contractType: "permanent" }, settings);
    assert.equal(result.keep, true, title);
  }
  const noise = prefilterJob({ title: "Software Engineer", location: "London", workPattern: "hybrid", contractType: "permanent" }, settings);
  assert.equal(noise.keep, false);
});

test("on-site radius drops one outside place and keeps a mix, a country, or a flexible line", () => {
  const leeds = prefilterJob({ title: "Head of Privacy", location: "Leeds", workPattern: "on-site", contractType: "permanent", description: "Office based." }, settings);
  assert.equal(leeds.keep, false);
  const hybrid = prefilterJob({ title: "Head of Privacy", location: "Leeds", workPattern: "hybrid", contractType: "permanent" }, settings);
  assert.equal(hybrid.keep, true);
  const multi = prefilterJob({ title: "Head of Privacy", location: "London, Manchester", workPattern: "on-site", contractType: "permanent" }, settings);
  assert.equal(multi.keep, true);
  const country = prefilterJob({ title: "Head of Privacy", location: "United Kingdom", workPattern: "on-site", contractType: "permanent" }, settings);
  assert.equal(country.keep, true);
  const blank = prefilterJob({ title: "Head of Privacy", location: "", workPattern: "on-site", contractType: "permanent" }, settings);
  assert.equal(blank.keep, true);
  const flexible = prefilterJob(
    { title: "Head of Privacy", location: "Leeds", workPattern: "on-site", contractType: "permanent", description: "Hybrid, and some work from home." },
    settings,
  );
  assert.equal(flexible.keep, true);
});

test("unknown contract stays, and a stated type drops only when that type is off", () => {
  const off = defaultSettings();
  off.contractTypes.permanent = false;
  off.contractTypes.contract = false;
  const unknown = prefilterJob({ title: "Head of Privacy", location: "London", workPattern: "hybrid", contractType: "permanent", description: "A privacy role." }, off);
  assert.equal(unknown.keep, true);
  const stated = prefilterJob(
    { title: "Head of Privacy", location: "London", workPattern: "hybrid", contractType: "contract", description: "This is a day rate contract.", contractExplicit: "contract" },
    off,
  );
  assert.equal(stated.keep, false);
});

test("hard legal language is a blocker, and general counsel is not", () => {
  const hard = closedBlockers("You must be a qualified solicitor and hold a practising certificate.");
  assert.ok(hard.some((item) => /lawyer/i.test(item)));
  assert.deepEqual(closedBlockers("You will report to the General Counsel."), []);
  const soft = scoreLocal(
    {
      title: "Head of Privacy",
      company: "Colt",
      location: "London",
      workPattern: "hybrid",
      europeRemote: false,
      description: "A legal qualification is desirable. Law degree or equivalent experience.",
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      currency: "GBP",
      contractType: "permanent",
    },
    settings,
  );
  assert.equal(soft.blockers.length, 0);
  assert.ok(soft.flags.some((item) => /solicitor/i.test(item)));
});

test("lookback follows the last success, and a failure does not open a permanent gap", () => {
  const now = new Date("2026-10-08T10:00:00.000Z").getTime();
  const runs = [
    { finishedAt: "2026-10-08T08:00:00.000Z", errors: ["linkedin"], counts: { linkedin: { error: "nope" } } },
    { finishedAt: "2026-10-08T04:00:00.000Z", errors: [], counts: { linkedin: { error: null } } },
  ];
  assert.equal(lookbackSince(runs as never, now), 8);
  assert.equal(lookbackSince([], now), 24 * 7);
});

test("phrases are chunked, and a full chunk is logged as a cap", () => {
  const chunks = chunkPhrases(["a", "b", "c", "d", "e", "f", "g", "h", "i"], 8);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[1].length, 1);
  const notes = rowCapNotes({ phrases: ["Privacy Manager"], locations: ["London", "United Kingdom"], rows: 200, returned: 400 });
  assert.match(notes[0], /cap/);
  assert.equal(runBudget(4).usd, 2);
  assert.equal(runBudget(24 * 7).usd, 5);
  assert.equal(runBudget(4).maxItems, 1600);
  assert.equal(chunkBudget(4, 2).usd, 1);
  assert.equal(chunkBudget(4, 2).maxItems, 800);
});

test("already applied matches the posting, or the company and title inside 90 days", () => {
  const now = new Date("2026-10-08T10:00:00.000Z").getTime();
  const jobs = [
    { id: "job-linkedin-1", status: "applied", applicationKey: "acme|head of privacy", statusChangedAt: "2026-01-01T00:00:00.000Z" },
    { id: "job-linkedin-2", status: "applied", applicationKey: "beta|privacy manager", statusChangedAt: "2026-09-01T00:00:00.000Z" },
  ];
  assert.equal(alreadyAppliedMatch({ postingId: "job-linkedin-1", applicationKey: "other|other", now, jobs, applications: [] }), true);
  assert.equal(alreadyAppliedMatch({ postingId: "job-linkedin-9", applicationKey: "acme|head of privacy", now, jobs, applications: [] }), false);
  assert.equal(alreadyAppliedMatch({ postingId: "job-linkedin-9", applicationKey: "beta|privacy manager", now, jobs, applications: [] }), true);
});

test("a loosened prefilter releases a recent filtered role and leaves an old one", () => {
  const store = { jobs: [], statusEvents: [], settings } as unknown as Store;
  const recent = filteredJob("recent", new Date().toISOString(), "Compliance Manager");
  const old = filteredJob("old", "2026-01-01T00:00:00.000Z", "Compliance Manager");
  const lawyer = filteredJob("lawyer", new Date().toISOString(), "Senior Counsel");
  store.jobs = [recent, old, lawyer];
  const result = replayFiltered(store);
  assert.equal(result.released, 1);
  assert.equal(recent.status, "unscored");
  assert.equal(old.status, "filtered");
  assert.equal(lawyer.status, "filtered");
});

function filteredJob(id: string, firstSeenAt: string, title: string): Job {
  return {
    id,
    dedupeKey: id,
    applicationKey: id,
    title,
    company: "Acme",
    location: "London",
    workPattern: "hybrid",
    hybridDays: null,
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
    status: "filtered",
    statusChangedAt: firstSeenAt,
    firstSeenAt,
    filteredReason: "Title is outside the enabled search tiers",
    letterNotes: "",
    privateNote: "",
    demo: false,
  };
}
