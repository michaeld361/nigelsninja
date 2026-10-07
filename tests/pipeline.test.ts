import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultSettings } from "../lib/defaults";
import { styleCheck } from "../lib/style-check";
import { applicationKey, dedupeKey } from "../lib/text";
import { normaliseRaw } from "../pipeline/normalise";
import { prefilterJob } from "../pipeline/prefilter";
import { scoreLocal } from "../pipeline/score";
import { draftLetterLocal, enforceStyle } from "../pipeline/write";
import type { RawJob } from "../lib/types";

const settings = defaultSettings();

test("keeps real senior titles and drops junior ones", () => {
  const keep = ["Senior Data Protection Specialist", "Data Governance Assistant Director", "Data Protection Officer", "Head of Privacy"];
  for (const title of keep) {
    const result = prefilterJob({ title, location: "London, hybrid", workPattern: "hybrid", contractType: "permanent" }, settings);
    assert.equal(result.keep, true, title);
  }
  const drop = [
    ["Data Protection Analyst", "Analyst"],
    ["Privacy Coordinator", "Coordinator"],
    ["Data Protection Executive", "Executive"],
    ["Privacy Officer", "Officer"],
    ["Assistant Data Protection Manager", "Assistant"],
  ] as const;
  for (const [title, word] of drop) {
    const result = prefilterJob({ title, location: "London", workPattern: "hybrid", contractType: "permanent" }, settings);
    assert.equal(result.keep, false, title);
    assert.match(result.reason || "", new RegExp(word));
  }
});

test("drops on-site Leeds and flags Europe remote", () => {
  const leeds = prefilterJob({ title: "Head of Privacy", location: "Leeds, on-site", workPattern: "on-site", contractType: "permanent" }, settings);
  assert.equal(leeds.keep, false);
  const europe = prefilterJob(
    { title: "Privacy Senior Manager", location: "Amsterdam, Europe remote", workPattern: "remote", contractType: "permanent" },
    settings,
  );
  assert.equal(europe.keep, true);
  assert.equal(europe.europeRemote, true);
  const farnborough = prefilterJob(
    { title: "Data Privacy Manager", location: "Farnborough, hybrid", workPattern: "hybrid", contractType: "permanent" },
    settings,
  );
  assert.equal(farnborough.keep, true);
});

test("collapses the same company and title across LinkedIn and Reed", () => {
  const linkedin = normaliseRaw(raw("linkedin", "Monzo", "Senior Data Protection Manager", "London, hybrid"));
  const reed = normaliseRaw(raw("reed", "Monzo", "Data Protection Manager", "London"));
  assert.equal(linkedin.dedupeKey, reed.dedupeKey);
  assert.equal(dedupeKey("PureGym", "Group Data Compliance Manager", "London", "hybrid"), dedupeKey("PureGym Group", "Group Data Compliance Manager", "London, hybrid", "hybrid"));
});

test("a required solicitor caps the score at 40", () => {
  const result = scoreLocal(
    {
      title: "Head of Data Protection",
      company: "Linklaters",
      location: "London, on-site",
      workPattern: "on-site",
      europeRemote: false,
      description: "Requirements: you must be a qualified solicitor with a current practising certificate. Qualified UK solicitor. Equivalent experience without admission will not be considered. The role runs DPIAs and DSARs.",
      salaryMin: 90000,
      salaryMax: 120000,
      salaryPeriod: "year",
      currency: "GBP",
      contractType: "permanent",
    },
    settings,
  );
  assert.ok(result.score <= 40);
  assert.ok(result.blockers.some((item) => /solicitor/i.test(item)));
});

test("a generated letter follows the hard rules", () => {
  const score = scoreLocal(
    {
      title: "Data Protection Manager",
      company: "Monzo",
      location: "London, hybrid",
      workPattern: "hybrid",
      europeRemote: false,
      description: "Own DPIAs, records of processing, vendor due diligence and DSARs for a UK bank. GDPR and SCCs. OneTrust. Start date as soon as you are available. Salary £70,000 to £85,000.",
      salaryMin: 70000,
      salaryMax: 85000,
      salaryPeriod: "year",
      currency: "GBP",
      contractType: "permanent",
    },
    settings,
  );
  const draft = enforceStyle(
    draftLetterLocal(
      {
        company: "Monzo",
        title: "Data Protection Manager",
        location: "London, hybrid",
        contractType: "permanent",
        sourceLabel: "LinkedIn",
        description: "Own DPIAs, records of processing, vendor due diligence and DSARs. Start date as soon as possible.",
        letterNotes: "",
      },
      score,
      settings,
    ),
    {
      company: "Monzo",
      title: "Data Protection Manager",
      location: "London, hybrid",
      contractType: "permanent",
      sourceLabel: "LinkedIn",
      description: "Own DPIAs, records of processing, vendor due diligence and DSARs. Start date as soon as possible.",
      letterNotes: "",
    },
    score,
    settings,
  );
  const check = styleCheck(draft.body.join("\n\n"));
  assert.deepEqual(check.issues, []);
  assert.equal(draft.body.join(" ").match(/\bMantle\b/gi)?.length ?? 0, draft.body.join(" ").includes("Mantle") ? 1 : 0);
});

test("an already applied company and title key matches the tracker", () => {
  assert.equal(applicationKey("PureGym", "Group Data Compliance Manager"), applicationKey("PureGym Group", "Senior Group Data Compliance Manager"));
});

test("a second run does not duplicate jobs or resurface an applied role", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nja-"));
  const previous = process.env.DATA_DIR;
  process.env.DATA_DIR = dir;
  const { emptyStore, saveStore, loadStore } = await import("../lib/store");
  const { runPipeline } = await import("../pipeline/run");
  const store = emptyStore();
  store.profile.cvText = "Nigel Down. CIPP/E, CIPM and AIGP. Data Privacy and Operations Director, MullenLowe Global, January 2018 to July 2026. GDPR, DPIAs, RoPAs, OneTrust, Purview.";
  store.profile.cvVersion = 1;
  store.profile.linkedinSummary = "Privacy operations across EMEA.";
  store.profile.personalStatement = "Hands-on privacy leadership.";
  store.applications.push({
    id: "applied-puregym",
    jobId: null,
    company: "PureGym",
    title: "Group Data Compliance Manager",
    applicationKey: applicationKey("PureGym", "Group Data Compliance Manager"),
    appliedAt: "2026-10-06T00:00:00.000Z",
    outcome: null,
    outcomeAt: null,
  });
  saveStore(store);
  const sources = ["linkedin", "reed", "jsearch"] as const;
  const first = await runPipeline({ trigger: "manual", by: "test", sources: [...sources] });
  const second = await runPipeline({ trigger: "manual", by: "test", sources: [...sources] });
  const after = loadStore();
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (second.ok) assert.equal(second.run.totals.new, 0);
  const monzo = after.jobs.filter((job) => job.company === "Monzo");
  assert.equal(monzo.length, 1);
  assert.ok(monzo[0].sources.length >= 2);
  assert.equal(after.jobs.some((job) => /puregym/i.test(job.company)), false);
  const linklaters = after.jobs.find((job) => job.company === "Linklaters");
  assert.ok(linklaters);
  const fit = after.fitAssessments.find((item) => item.jobId === linklaters?.id);
  assert.ok(fit && fit.score <= 40 && fit.blockers.length > 0);
  const generated = after.letters.filter((letter) => letter.origin === "generated");
  assert.ok(generated.length >= 5);
  for (const letter of generated) {
    assert.deepEqual(styleCheck(letter.body.join("\n\n")).issues, [], letter.notesForNigel);
  }
  process.env.DATA_DIR = previous;
});

function raw(source: RawJob["source"], company: string, title: string, location: string): RawJob {
  return {
    source,
    externalId: `${source}-${company}`,
    title,
    company,
    location,
    description: "Privacy role",
    listingUrl: `https://example.com/${source}/${company}`,
    postedAt: new Date().toISOString(),
    workPattern: "hybrid",
  };
}
