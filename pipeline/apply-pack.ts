import { LETTER_PROMPT_VERSION } from "@/lib/defaults";
import { loadStore, updateStore } from "@/lib/store";
import { stripLongDashes, toUkEnglish } from "@/lib/text";
import type { ApplyContact, ApplyPack, CompanySource, HowToApply, Job, Letter, Settings } from "@/lib/types";
import { buildSpecAnalysis } from "./spec-analysis";
import { factCheck } from "./check";
import { callClaude, callClaudeWithWebSearch, extractJson } from "./llm";
import { scoreLocal, type ScoreResult } from "./score";
import { appendWeighing, weighingText } from "@/lib/weighing";
import { draftLetterLocal, enforceStyle, type LetterDraft } from "./write";
import { styleCheck } from "@/lib/style-check";
import { z } from "zod";

const LetterSchema = z.object({
  letter_paragraphs: z.array(z.string()).min(3).max(6),
});

const SourceSchema = z
  .union([z.object({ label: z.string().optional(), url: z.string() }), z.string()])
  .transform((item) => (typeof item === "string" ? { label: item, url: item } : { label: item.label || item.url, url: item.url }));

const ASK_LIMIT = 20;

const SectionsSchema = z.object({
  steps: z.array(z.string().min(4)).min(2).max(6),
  asks: z.array(z.string().min(2)).max(ASK_LIMIT).optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_link: z.string().nullable().optional(),
  contact_link_label: z.string().nullable().optional(),
  contact_none: z.string().nullable().optional(),
  company_note: z.string().min(20),
  sources: z.array(SourceSchema).max(8).optional(),
  researched: z.boolean(),
});

const NONE_PUBLIC = "No named contact, email, or hiring link is public.";
const NO_NOTE = "A live lookup did not return a current source, so there is no company note.";

export function writingModel(): string {
  return process.env.WRITING_MODEL || "claude-fable-5-1";
}

export async function finishApplyPack(jobId: string): Promise<void> {
  try {
    const store = loadStore();
    const pack = store.applyPacks.find((item) => item.jobId === jobId && item.state === "preparing");
    const job = store.jobs.find((item) => item.id === jobId);
    if (!pack || !job) return;
    const fit = store.fitAssessments
      .filter((item) => item.jobId === jobId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const score: ScoreResult = fit
      ? {
          score: fit.score,
          summary: fit.summary,
          matches: fit.matches,
          gaps: fit.gaps,
          blockers: fit.blockers,
          flags: fit.flags,
          seniorityFit: fit.seniorityFit,
          locationFit: fit.locationFit,
          salaryNote: fit.salaryNote,
          model: fit.model,
          promptVersion: fit.promptVersion,
        }
      : scoreLocal(
          {
            title: job.title,
            company: job.company,
            location: job.location,
            workPattern: job.workPattern,
            europeRemote: job.europeRemote,
            description: job.descriptionText,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryPeriod: job.salaryPeriod,
            currency: job.currency,
            contractType: job.contractType,
          },
          store.settings,
        );
    const weighing = weighingText(store.notes, store.learnings);
    const composed = await compose(job, score, store.settings, store.profile, weighing);
    const sections = await researchSections(job);
    const lookingFor = await buildSpecAnalysis(job, store.profile, weighing);
    const letter = toLetter(job, composed.draft, store);
    letter.cvVersion = store.profile.cvVersion || 1;
    updateStore((next) => {
      const row = next.applyPacks.find((item) => item.id === pack.id);
      if (!row || row.state !== "preparing") return;
      next.letters.push(letter);
      row.letterId = letter.id;
      row.howToApply = sections.howToApply;
      row.contact = sections.contact;
      row.companyNote = sections.companyNote;
      row.companySources = sections.sources;
      row.lookingFor = lookingFor;
      row.liveResearch = sections.liveResearch;
      row.model = sections.model || composed.model;
      row.error = [composed.notice, sections.notice].filter(Boolean).join(" ") || null;
      row.state = "ready";
      row.readyAt = new Date().toISOString();
    });
  } catch (error) {
    updateStore((store) => {
      const row = store.applyPacks.find((item) => item.jobId === jobId && item.state === "preparing");
      if (!row) return;
      row.state = "failed";
      row.error = error instanceof Error ? error.message : "The draft did not finish.";
    });
  }
}

type Profile = { cvText: string; linkedinSummary: string; personalStatement: string };

async function compose(job: Job, score: ScoreResult, settings: Settings, profile: Profile, weighing = "") {
  const local = localPieces(job, score, settings);
  if (!process.env.ANTHROPIC_API_KEY) return local;
  try {
    const model = writingModel();
    const listing = job.sources.find((source) => source.source === "linkedin")?.url || job.applyUrl || job.sources[0]?.url || "";
    const text = await callClaude({
      model,
      maxTokens: 4000,
      system: [
        "You draft a job application pack for Nigel Down, a UK data privacy professional. UK English. No em dashes or en dashes. Hyphens are fine.",
        "Use only facts from the CV, LinkedIn summary and personal statement for the letter. Never write 'current role'. He left MullenLowe in July 2026. Write 'CIPP/E, CIPM and AIGP'. Mention Mantle at most once. 4 or 5 paragraphs, 220 to 380 words.",
        "Return JSON only, with the key letter_paragraphs.",
        ...(weighing.trim() ? [appendWeighing("Weigh this on the letter.", weighing)] : []),
        profile.cvText,
        profile.linkedinSummary,
        profile.personalStatement,
      ].join("\n\n"),
      user: [
        `Company: ${job.company}`,
        `Title: ${job.title}`,
        `Location: ${job.location}`,
        `Listing: ${listing}`,
        job.descriptionText,
        score.blockers.length ? `Do not claim he meets this: ${score.blockers.join(" ")}` : "",
        score.gaps.length ? `Do not invent experience of: ${score.gaps.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const parsed = LetterSchema.parse(extractJson(text));
    const cleaned = parsed.letter_paragraphs.map((paragraph) => toUkEnglish(stripLongDashes(paragraph)));
    let draft = enforceStyle(
      {
        ...local.draft,
        body: cleaned,
        model,
        configuredWritingModel: model,
        wordCount: cleaned.join(" ").split(/\s+/).filter(Boolean).length,
        styleIssues: styleCheck(cleaned.join("\n\n")).issues,
        unsupportedClaims: factCheck(cleaned.join("\n"), profile.cvText),
      },
      letterJob(job),
      score,
      settings,
    );
    const styleFailed = draft.styleIssues.length > 0 || draft.unsupportedClaims.length > 0 || draft.model === "local-draft";
    if (styleFailed && draft.model !== "local-draft") {
      draft = local.draft;
    }
    return { draft, model, notice: null as string | null };
  } catch (error) {
    return {
      ...local,
      notice: `Live drafting did not finish (${error instanceof Error ? error.message : "error"}). This pack was written on this machine from the CV and the listing.`,
    };
  }
}

function localPieces(job: Job, score: ScoreResult, settings: Settings) {
  const draft = enforceStyle(draftLetterLocal(letterJob(job), score, settings), letterJob(job), score, settings);
  return {
    draft,
    model: "local-draft",
    notice: "The letter was written on this machine from Nigel's CV and the listing.",
  };
}

export type SectionDraft = {
  howToApply: HowToApply;
  contact: ApplyContact;
  companyNote: string;
  sources: CompanySource[];
  liveResearch: boolean;
  model: string;
  notice: string | null;
};

export async function researchSections(job: Job): Promise<SectionDraft> {
  const fallback = localSections(job);
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const model = writingModel();
    const listing = applyUrl(job);
    const { text, searched, evidence } = await callClaudeWithWebSearch({
      model,
      maxTokens: 4000,
      maxUses: 6,
      system: [
        "You prepare three parts of a job application for Nigel Down. UK English. No em dashes or en dashes.",
        "Search the web for the company and for a public hiring contact before you answer. Do not use memory for facts about the company.",
        "Do not invent a person, an email, a hiring link, a date, or a company fact. If a page you retrieved does not say it, leave it out.",
        "steps: 3 to 5 short ordered steps. One sentence each. Do not paste the URL into a step.",
        "asks: short phrases for what the listing itself asks for. Only requirements written in the listing.",
        "Contact: set contact_name, contact_email, or contact_link only when that exact detail appears in the listing or in a page you retrieved. Otherwise set all three to null and set contact_none to exactly: No named contact, email, or hiring link is public.",
        "company_note: 3 to 5 sentences on what the company does now and anything recent that matters for this application. Every sentence must come from a retrieved page. List those pages in sources. If you cannot retrieve a page, set researched to false and set company_note to exactly: A live lookup did not return a current source, so there is no company note.",
        "Return JSON only, with keys steps, asks, contact_name, contact_email, contact_link, contact_link_label, contact_none, company_note, sources, researched.",
      ].join("\n"),
      user: [
        `Company: ${job.company}`,
        `Title: ${job.title}`,
        `Location: ${job.location}`,
        `Apply URL, use this and do not replace it: ${listing || "none"}`,
        job.descriptionText,
      ].join("\n\n"),
    });
    const parsed = await readSections(text, model);
    return settleSections(parsed, job, `${job.descriptionText}\n${evidence}`, searched, model);
  } catch {
    return { ...fallback, notice: "Live lookup did not finish, so these sections use the listing on file." };
  }
}

export function parseSectionNotes(value: unknown): z.infer<typeof SectionsSchema> {
  return SectionsSchema.parse(normaliseSectionPayload(value));
}

function normaliseSectionPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const row = { ...(value as Record<string, unknown>) };
  if (Array.isArray(row.asks)) {
    row.asks = row.asks
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, ASK_LIMIT);
  }
  if (Array.isArray(row.steps)) {
    const steps = row.steps
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= 4)
      .slice(0, 6);
    if (steps.length >= 2) row.steps = steps;
  }
  if (Array.isArray(row.sources)) row.sources = row.sources.slice(0, 8);
  return row;
}

async function readSections(text: string, model: string): Promise<z.infer<typeof SectionsSchema>> {
  try {
    return parseSectionNotes(extractJson(text));
  } catch {
    const repaired = await callClaude({
      model,
      maxTokens: 2000,
      system: "Turn the notes into one JSON object and nothing else. Keys: steps, asks, contact_name, contact_email, contact_link, contact_link_label, contact_none, company_note, sources, researched. sources is an array of objects with label and url. Use null for unknown contact fields. Do not add facts.",
      user: text.slice(0, 12000),
    });
    return parseSectionNotes(extractJson(repaired));
  }
}

export async function refreshApplySections(jobId: string): Promise<SectionDraft | null> {
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === jobId);
  const pack = store.applyPacks.find((item) => item.jobId === jobId);
  if (!job || !pack || pack.state === "preparing") return null;
  const sections = await researchSections(job);
  const failed = sections.model === "local-draft";
  updateStore((next) => {
    const row = next.applyPacks.find((item) => item.jobId === jobId);
    if (!row) return;
    if (!failed) {
      row.howToApply = sections.howToApply;
      row.contact = sections.contact;
      row.companyNote = sections.companyNote;
      row.companySources = sections.sources;
      row.liveResearch = sections.liveResearch;
      row.model = sections.model || row.model;
      row.error = sections.notice;
    }
    row.state = "ready";
    row.readyAt = row.readyAt || new Date().toISOString();
  });
  return sections;
}

export function localSections(job: Job): SectionDraft {
  const url = applyUrl(job);
  const email = job.descriptionText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const posted = job.descriptionText.match(/Posted on LinkedIn by ([^.\n]+)/)?.[1]?.trim() ?? null;
  return {
    howToApply: {
      steps: [
        "Open the LinkedIn listing.",
        "Use Apply on that page, and do not send the letter to a guessed address.",
        "Attach the CV and this letter.",
      ],
      url,
      asks: asksFromListing(job.descriptionText),
    },
    contact:
      email || posted
        ? { name: posted, email, link: null, linkLabel: null, none: null }
        : { name: null, email: null, link: null, linkLabel: null, none: NONE_PUBLIC },
    companyNote: NO_NOTE,
    sources: [],
    liveResearch: false,
    model: "local-draft",
    notice: "Live company research did not run.",
  };
}

export function settleSections(
  parsed: z.infer<typeof SectionsSchema>,
  job: Job,
  evidence: string,
  searched: boolean,
  model: string,
): SectionDraft {
  const haystack = evidence.toLowerCase();
  const email = cleanField(parsed.contact_email);
  const name = cleanField(parsed.contact_name);
  const link = cleanField(parsed.contact_link);
  const keptEmail = email && haystack.includes(email.toLowerCase()) ? email : null;
  const keptName = name && nameInEvidence(name, haystack) ? tidy(name) : null;
  const keptLink = link && urlInEvidence(link, evidence) ? link : null;
  const contact: ApplyContact =
    keptEmail || keptName || keptLink
      ? {
          name: keptName,
          email: keptEmail,
          link: keptLink,
          linkLabel: keptLink ? tidy(cleanField(parsed.contact_link_label) || "Hiring link") : null,
          none: null,
        }
      : { name: null, email: null, link: null, linkLabel: null, none: NONE_PUBLIC };
  const sources = (parsed.sources || [])
    .map((source) => ({ label: tidy(source.label).slice(0, 120), url: source.url.trim() }))
    .filter((source) => urlInEvidence(source.url, evidence))
    .slice(0, 4);
  const live = Boolean(searched && parsed.researched && sources.length);
  const companyNote = live ? tidy(parsed.company_note) : NO_NOTE;
  return {
    howToApply: {
      steps: parsed.steps.map((step) => tidy(step)).slice(0, 6),
      url: applyUrl(job),
      asks: (parsed.asks || []).map((ask) => tidy(ask)).filter(Boolean).slice(0, ASK_LIMIT),
    },
    contact,
    companyNote,
    sources: live ? sources : [],
    liveResearch: live,
    model,
    notice: live ? null : null,
  };
}

function asksFromListing(description: string): string[] {
  const lines = description
    .split(/\n+/)
    .map((line) => line.replace(/^[\s\-*•]+/, "").trim())
    .filter(Boolean);
  const out: string[] = [];
  let capture = false;
  for (const line of lines) {
    if (/^(must haves?|in this role|requirements|essential)\b/i.test(line)) {
      capture = true;
      continue;
    }
    if (/^(we hope|why should|our clients|about the company|you will contribute)\b/i.test(line)) capture = false;
    if (capture && line.length > 12 && line.length < 200) out.push(line);
  }
  if (out.length) return out.slice(0, ASK_LIMIT);
  return lines.filter((line) => /must have|hands-on experience|right to work/i.test(line)).slice(0, 6);
}

function applyUrl(job: Job): string {
  return job.sources.find((source) => source.source === "linkedin")?.url || job.applyUrl || job.sources[0]?.url || "";
}

function cleanField(value: string | null | undefined): string | null {
  const text = (value || "").trim();
  if (!text || /^null$/i.test(text) || text === "none") return null;
  return text;
}

function nameInEvidence(name: string, haystack: string): boolean {
  const parts = name.toLowerCase().split(/\s+/).filter((part) => part.length > 2);
  return parts.length > 0 && parts.every((part) => haystack.includes(part));
}

function urlInEvidence(url: string, evidence: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return evidence.includes(parsed.href) || evidence.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function letterJob(job: Job) {
  return {
    company: job.company,
    title: job.title,
    location: job.location,
    contractType: job.contractType,
    sourceLabel: "LinkedIn",
    description: job.descriptionText,
    letterNotes: job.letterNotes,
  };
}

function tidy(text: string): string {
  return toUkEnglish(stripLongDashes(text)).trim();
}

function toLetter(job: Job, draft: LetterDraft, store: { letters: Letter[]; settings: Settings }): Letter {
  const version = store.letters.filter((item) => item.jobId === job.id).reduce((max, item) => Math.max(max, item.version), 0) + 1;
  return {
    id: `letter-${job.id}-apply-${version}`,
    jobId: job.id,
    version,
    model: draft.model,
    configuredWritingModel: draft.configuredWritingModel,
    promptVersion: LETTER_PROMPT_VERSION,
    cvVersion: 1,
    refLine: draft.refLine,
    salutation: draft.salutation,
    body: draft.body,
    signOff: draft.signOff,
    notesForNigel: draft.notesForNigel,
    unsupportedClaims: draft.unsupportedClaims,
    styleIssues: draft.styleIssues,
    wordCount: draft.wordCount,
    editedBody: null,
    disclaimerEnabled: store.settings.disclaimerEnabled,
    state: "draft",
    origin: "generated",
    docxPath: null,
    createdAt: new Date().toISOString(),
  };
}

export function createPreparingPack(jobId: string): ApplyPack {
  return {
    id: `apply-${jobId}`,
    jobId,
    state: "preparing",
    letterId: null,
    howToApply: null,
    contact: null,
    companyNote: null,
    companySources: [],
    lookingFor: [],
    liveResearch: false,
    model: "",
    error: null,
    createdAt: new Date().toISOString(),
    readyAt: null,
  };
}
