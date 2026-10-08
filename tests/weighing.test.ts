import assert from "node:assert/strict";
import test from "node:test";
import { appendWeighing, rememberLearning, rememberNote, weighingText } from "../lib/weighing";
import { scoreUser } from "../pipeline/score";

test("a rejection learning keeps the role, the reason, and the original date", () => {
  const first = rememberLearning([], {
    jobId: "job-1",
    company: "Acme",
    title: "Data Protection Officer",
    reason: "Too legal",
    now: "2026-10-01T09:00:00.000Z",
  });
  assert.equal(first.saved, true);
  assert.equal(first.learnings[0].at, "2026-10-01T09:00:00.000Z");
  const edited = rememberLearning(first.learnings, {
    jobId: "job-1",
    company: "Acme",
    title: "Data Protection Officer",
    reason: "They wanted a practising solicitor",
    now: "2026-10-08T09:00:00.000Z",
  });
  assert.equal(edited.learnings.length, 1);
  assert.equal(edited.learnings[0].at, "2026-10-01T09:00:00.000Z");
  assert.equal(edited.learnings[0].reason, "They wanted a practising solicitor");
  assert.equal(edited.learnings[0].updatedAt, "2026-10-08T09:00:00.000Z");
  const blank = rememberLearning(edited.learnings, {
    jobId: "job-1",
    company: "Acme",
    title: "Data Protection Officer",
    reason: "   ",
    now: "2026-10-08T10:00:00.000Z",
  });
  assert.equal(blank.saved, false);
  assert.equal(blank.learnings[0].reason, "They wanted a practising solicitor");
});

test("notes can be added and edited without touching anything else", () => {
  const added = rememberNote([], { text: "Prefer hybrid London", now: "2026-10-08T09:00:00.000Z" });
  assert.equal(added.saved, true);
  assert.equal(added.notes.length, 1);
  const edited = rememberNote(added.notes, { id: added.notes[0].id, text: "Prefer hybrid, inside London", now: "2026-10-08T12:00:00.000Z" });
  assert.equal(edited.notes[0].text, "Prefer hybrid, inside London");
  assert.equal(edited.notes[0].createdAt, "2026-10-08T09:00:00.000Z");
  assert.equal(rememberNote(edited.notes, { text: "  ", now: "2026-10-08T12:00:00.000Z" }).saved, false);
});

test("the scoring and letter prompts receive the stored notes and learnings, and stay put when there are none", () => {
  const text = weighingText(
    [{ text: "Prefer hybrid London" }],
    [{ company: "Acme", title: "Data Protection Officer", reason: "They wanted a practising solicitor", at: "2026-10-01T09:00:00.000Z" }],
  );
  assert.match(text, /Prefer hybrid London/);
  assert.match(text, /Data Protection Officer at Acme/);
  assert.match(text, /practising solicitor/);
  assert.match(text, /2026-10-01/);
  const scored = scoreUser("cv", { title: "DPO" }, { score: 40 }, text);
  assert.match(scored, /nigel_notes/);
  assert.match(scored, /Prefer hybrid London/);
  assert.match(scored, /practising solicitor/);
  const letter = appendWeighing("BASE", text);
  assert.match(letter, /BASE/);
  assert.match(letter, /Data Protection Officer at Acme/);
  assert.equal(appendWeighing("BASE", ""), "BASE");
  assert.equal(scoreUser("cv", { title: "DPO" }, { score: 40 }, ""), `<profile>\ncv\n</profile>\n<job>\n${JSON.stringify({ title: "DPO" })}\n</job>\n<local_hint>\n${JSON.stringify({ score: 40 })}\n</local_hint>`);
});
