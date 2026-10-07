import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { ALLOWED_USERS, CONTACT } from "../lib/defaults";
import { applicationKey, wordCount } from "../lib/text";
import { emptyStore, loadStore, saveStore, writeSeed } from "../lib/store";
import { scoreLocal } from "../pipeline/score";
import { runPipeline } from "../pipeline/run";

const sources = path.join(process.cwd(), "sources");

function excelDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return utc.toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function specificNotes(notes: string): string {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/write a cover letter|not too warm|do not use|hyphen|dashboard|mantle|emphasis/i.test(line))
    .join("\n");
}

function parseLetter(text: string) {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let salutation = "Dear Hiring Manager,";
  const body: string[] = [];
  for (const line of lines) {
    if (/^dear /i.test(line)) {
      salutation = line.endsWith(",") ? line : `${line},`;
      continue;
    }
    if (/^kind regards/i.test(line) || /^nigel down$/i.test(line) || /^ai-assisted/i.test(line)) continue;
    if (/^(m:|email:|data privacy|hiring team)/i.test(line)) continue;
    if (/2026/.test(line) && line.length < 40) continue;
    body.push(line);
  }
  return { salutation, body: body.length ? body : [text.trim()] };
}

async function main() {
const cvPath = path.join(sources, "Nigel_Down_CV_Data_Privacy_Professional_October_2026.docx");
const cv = (await mammoth.extractRawText({ path: cvPath })).value.trim();
const workbook = XLSX.read(fs.readFileSync(path.join(sources, "Job_specification_data.xlsx")));
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

const store = emptyStore();
store.allowedUsers = ALLOWED_USERS;
store.profile = {
  cvText: cv,
  cvVersion: 1,
  cvHistory: [],
  linkedinSummary: String(rows[0]?.["LinkedIn Profile"] || ""),
  personalStatement: String(rows[0]?.["Personal Statement"] || ""),
  phone: CONTACT.phone,
  email: CONTACT.email,
  addressLines: [...CONTACT.address],
  linkedinUrl: CONTACT.linkedin,
  headline: CONTACT.title,
  updatedAt: new Date().toISOString(),
};
store.profileFiles.push(
  {
    id: "file-cv-1",
    storagePath: path.join("sources", "Nigel_Down_CV_Data_Privacy_Professional_October_2026.docx"),
    filename: "Nigel_Down_CV_Data_Privacy_Professional_October_2026.docx",
    kind: "cv",
    version: 1,
    uploadedAt: store.profile.updatedAt,
    label: "CV version 1, October 2026",
  },
  {
    id: "file-certificates",
    storagePath: path.join("sources", "CIPPE_CIPM_AIGP_Certificates.pptx"),
    filename: "CIPPE_CIPM_AIGP_Certificates.pptx",
    kind: "certificate",
    version: null,
    uploadedAt: store.profile.updatedAt,
    label: "CIPP/E, CIPM and AIGP certificates",
  },
);

let imported = 0;
for (const row of rows) {
  const company = String(row["Company Name"] || "").trim();
  const title = String(row["Job Title"] || "").trim();
  if (!company || company.toLowerCase() === "template" || title.toLowerCase() === "template") continue;
  const spec = String(row["Job Specification"] || "");
  const appliedAt = excelDate(row["Date"]);
  const id = `seed-${applicationKey(company, title).replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
  const fit = spec
    ? scoreLocal(
        {
          title,
          company,
          location: "United Kingdom",
          workPattern: "hybrid",
          europeRemote: false,
          description: spec,
          salaryMin: null,
          salaryMax: null,
          salaryPeriod: null,
          currency: "GBP",
          contractType: "permanent",
        },
        store.settings,
      )
    : null;
  store.jobs.push({
    id,
    dedupeKey: `${applicationKey(company, title)}|tracker`,
    applicationKey: applicationKey(company, title),
    title,
    company,
    location: "United Kingdom",
    workPattern: "hybrid",
    hybridDays: null,
    europeRemote: false,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    currency: null,
    contractType: "permanent",
    postedAt: appliedAt,
    closesAt: null,
    deadline: null,
    sources: [{ source: "linkedin", url: "", publisher: "Tracker", demo: false }],
    applyUrl: null,
    descriptionText: spec || "Specification was not stored on this tracker row.",
    status: "applied",
    statusChangedAt: appliedAt,
    firstSeenAt: appliedAt,
    filteredReason: null,
    letterNotes: specificNotes(String(row["Prompt Notes"] || "")),
    privateNote: "",
    demo: false,
  });
  store.applications.push({
    id: `app-${id}`,
    jobId: id,
    company,
    title,
    applicationKey: applicationKey(company, title),
    appliedAt,
    outcome: null,
    outcomeAt: null,
  });
  store.statusEvents.push({ id: `event-${id}`, jobId: id, from: null, to: "applied", at: appliedAt, by: "import" });
  if (fit) {
    store.fitAssessments.push({
      id: `fit-${id}`,
      jobId: id,
      model: fit.model,
      promptVersion: fit.promptVersion,
      score: fit.score,
      summary: fit.summary,
      matches: fit.matches,
      gaps: fit.gaps,
      blockers: fit.blockers,
      flags: fit.flags,
      seniorityFit: fit.seniorityFit,
      locationFit: fit.locationFit,
      salaryNote: fit.salaryNote,
      createdAt: appliedAt,
    });
  }
  const letterText = String(row["Cover Letter"] || "").trim();
  if (letterText) {
    const parsed = parseLetter(letterText);
    store.letters.push({
      id: `letter-${id}`,
      jobId: id,
      version: 1,
      model: "imported-from-tracker",
      configuredWritingModel: "imported-from-tracker",
      promptVersion: "imported",
      cvVersion: 1,
      refLine: `Ref: ${company}, ${title}`,
      salutation: parsed.salutation,
      body: parsed.body,
      signOff: "Kind regards,",
      notesForNigel: "Imported from Nigel's tracker. This is his own letter, not a new draft.",
      unsupportedClaims: [],
      styleIssues: [],
      wordCount: wordCount(parsed.body.join(" ")),
      editedBody: null,
      disclaimerEnabled: false,
      state: "reviewed",
      origin: "imported",
      docxPath: null,
      createdAt: appliedAt,
    });
  }
  imported += 1;
}

saveStore(store);
const run = await runPipeline({ trigger: "manual", by: "import" });
if (!run.ok) throw new Error(run.message);
const seeded = loadStore();
seeded.sessions = [];
seeded.magicLinks = [];
seeded.runLock = null;
writeSeed(seeded);
saveStore(seeded);
console.log(`Imported ${imported} applications and finished run ${run.run.id}: ${run.run.totals.fetched} fetched, ${run.run.totals.worthALook} worth a look.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
