import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createPreparingPack, finishApplyPack } from "../pipeline/apply-pack";
import { specSystem } from "../pipeline/spec-analysis";
import { emptyStore, loadStore, saveStore } from "../lib/store";
import type { Job, Letter } from "../lib/types";

test("what they are looking for weighs notes only when there are some", () => {
  const plain = specSystem("CIPP/E");
  assert.equal(plain.includes("<nigel_notes>"), false);
  assert.equal(plain.includes("CIPP/E"), true);
  const weighed = specSystem("CIPP/E", "Notes:\n- Prefer hybrid London");
  assert.equal(weighed.includes("<nigel_notes>"), true);
  assert.equal(weighed.includes("Prefer hybrid London"), true);
  assert.equal(specSystem("CIPP/E", "   "), plain);
});

test("a preparing pack is rewritten once, and a ready pack is left alone", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nja-regen-"));
  const previousDir = process.env.DATA_DIR;
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.DATA_DIR = dir;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const store = emptyStore();
    store.profile.cvText = "Nigel Down. CIPP/E, CIPM and AIGP. Data Privacy and Operations Director, MullenLowe Global, January 2018 to July 2026.";
    store.profile.cvVersion = 1;
    store.notes = [
      {
        id: "note-1",
        text: "Prefer hybrid London",
        createdAt: "2026-10-08T09:00:00.000Z",
        updatedAt: "2026-10-08T09:00:00.000Z",
      },
    ];
    store.learnings = [
      {
        id: "learn-1",
        jobId: "other-job",
        company: "Acme",
        title: "Data Protection Officer",
        reason: "They wanted a practising solicitor",
        at: "2026-10-01T09:00:00.000Z",
        updatedAt: "2026-10-01T09:00:00.000Z",
      },
    ];
    store.jobs.push(job());
    store.letters.push(oldLetter());
    const pack = createPreparingPack(job().id);
    pack.state = "preparing";
    pack.letterId = "letter-old";
    pack.howToApply = { steps: ["Old step one.", "Old step two."], url: "https://example.com/old", asks: ["Old ask"] };
    pack.contact = { name: "Old Name", email: null, link: null, linkLabel: null, none: null };
    pack.companyNote = "An old company note that should be replaced.";
    pack.lookingFor = [{ want: "Old want that is long enough.", show: "Old show that is long enough." }];
    pack.readyAt = "2026-10-01T00:00:00.000Z";
    store.applyPacks.push(pack);
    saveStore(store);

    await finishApplyPack(job().id);
    const rewritten = loadStore();
    const row = rewritten.applyPacks[0];
    assert.equal(row.state, "ready");
    assert.notEqual(row.letterId, "letter-old");
    assert.equal(rewritten.letters.length, 2);
    assert.equal(rewritten.letters.some((item) => item.id === "letter-old"), true);
    assert.equal(rewritten.notes[0].text, "Prefer hybrid London");
    assert.equal(rewritten.learnings[0].reason, "They wanted a practising solicitor");
    assert.ok(row.howToApply && typeof row.howToApply !== "string" && row.howToApply.steps.length >= 2);
    assert.ok(row.contact && typeof row.contact !== "string");
    assert.ok(row.companyNote && row.companyNote !== "An old company note that should be replaced.");
    assert.ok(row.lookingFor.length >= 3);
    assert.notEqual(row.readyAt, "2026-10-01T00:00:00.000Z");

    await finishApplyPack(job().id);
    const left = loadStore();
    assert.equal(left.letters.length, 2);
    assert.equal(left.applyPacks[0].letterId, row.letterId);
    assert.equal(left.applyPacks[0].state, "ready");
  } finally {
    process.env.DATA_DIR = previousDir;
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function job(): Job {
  return {
    id: "job-lex",
    dedupeKey: "lex",
    applicationKey: "lex",
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
    descriptionText: "Must have hands-on OneTrust and DPIA experience. Posted on LinkedIn by Ada Lovelace.",
    status: "new",
    statusChangedAt: "2026-10-01T00:00:00.000Z",
    firstSeenAt: "2026-10-01T00:00:00.000Z",
    filteredReason: null,
    letterNotes: "",
    privateNote: "",
    demo: false,
  };
}

function oldLetter(): Letter {
  return {
    id: "letter-old",
    jobId: "job-lex",
    version: 1,
    model: "local-draft",
    configuredWritingModel: "local-draft",
    promptVersion: "test",
    cvVersion: 1,
    refLine: "Application",
    salutation: "Dear hiring manager,",
    body: ["Old letter."],
    signOff: "Yours faithfully,",
    notesForNigel: "",
    unsupportedClaims: [],
    styleIssues: [],
    wordCount: 2,
    editedBody: null,
    disclaimerEnabled: null,
    state: "draft",
    origin: "generated",
    docxPath: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}
