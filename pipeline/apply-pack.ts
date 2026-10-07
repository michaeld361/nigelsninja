import { LETTER_PROMPT_VERSION } from "@/lib/defaults";
import { loadStore, updateStore } from "@/lib/store";
import { stripLongDashes, toUkEnglish } from "@/lib/text";
import type { ApplyPack, Job, Letter, Settings } from "@/lib/types";
import { factCheck } from "./check";
import { callClaudeWithWebSearch, extractJson } from "./llm";
import { scoreLocal, type ScoreResult } from "./score";
import { draftLetterLocal, enforceStyle, type LetterDraft } from "./write";
import { styleCheck } from "@/lib/style-check";
import { z } from "zod";

const PackSchema = z.object({
  letter_paragraphs: z.array(z.string()).min(3).max(6),
  how_to_apply: z.string().min(20),
  contact: z.string().min(8),
  company_note: z.string().min(40),
  researched: z.boolean(),
});

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
    const composed = await compose(job, score, store.settings, store.profile);
    const letter = toLetter(job, composed.draft, store);
    letter.cvVersion = store.profile.cvVersion || 1;
    updateStore((next) => {
      const row = next.applyPacks.find((item) => item.id === pack.id);
      if (!row || row.state !== "preparing") return;
      next.letters.push(letter);
      row.letterId = letter.id;
      row.howToApply = composed.howToApply;
      row.contact = composed.contact;
      row.companyNote = composed.companyNote;
      row.liveResearch = composed.liveResearch;
      row.model = composed.model;
      row.error = composed.notice;
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

async function compose(job: Job, score: ScoreResult, settings: Settings, profile: Profile) {
  const local = localPieces(job, score, settings);
  if (!process.env.ANTHROPIC_API_KEY) return local;
  try {
    const model = writingModel();
    const listing = job.sources.find((source) => source.source === "linkedin")?.url || job.applyUrl || job.sources[0]?.url || "";
    const { text, searched } = await callClaudeWithWebSearch({
      model,
      maxTokens: 4000,
      system: [
        "You draft a job application pack for Nigel Down, a UK data privacy professional. UK English. No em dashes or en dashes. Hyphens are fine.",
        "Use only facts from the CV, LinkedIn summary and personal statement for the letter. Never write 'current role'. He left MullenLowe in July 2026. Write 'CIPP/E, CIPM and AIGP'. Mention Mantle at most once. 4 or 5 paragraphs, 220 to 380 words.",
        "Search the web for the company before the company note. Do not rely on memory. If the search does not return a usable current source, say so and use only the job listing. Set researched to true only when the company note uses a web result.",
        "Do not invent a recruiter, an email, or an application portal. If the listing has no named contact, say so.",
        "Return JSON only, with keys letter_paragraphs, how_to_apply, contact, company_note, researched.",
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
    const parsed = PackSchema.parse(extractJson(text));
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
    const live = Boolean(parsed.researched && searched);
    return {
      draft,
      howToApply: tidy(parsed.how_to_apply),
      contact: tidy(parsed.contact),
      companyNote: tidy(parsed.company_note),
      liveResearch: live,
      model,
      notice: live ? null : "The company note did not use a live web result, so treat it as coming from the listing.",
    };
  } catch (error) {
    return {
      ...local,
      notice: `Live drafting did not finish (${error instanceof Error ? error.message : "error"}). This pack was written on this machine from the CV and the listing.`,
    };
  }
}

function localPieces(job: Job, score: ScoreResult, settings: Settings) {
  const draft = enforceStyle(draftLetterLocal(letterJob(job), score, settings), letterJob(job), score, settings);
  const url = job.sources.find((source) => source.source === "linkedin")?.url || job.applyUrl || job.sources[0]?.url || "";
  const email = job.descriptionText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  return {
    draft,
    howToApply: url
      ? `Open the LinkedIn posting and use Apply there. ${url} The listing is the application route. Do not send the letter to a guessed address.`
      : "The listing did not include an apply link. Open the role on LinkedIn and apply from the posting.",
    contact: email
      ? `The listing names ${email}. There is no hiring manager named in the text we have.`
      : "No named contact on the listing. Apply through the LinkedIn posting rather than guessing an email.",
    companyNote: `Live company research did not run, because this machine has no Anthropic key. This note uses only the job listing.\n\n${job.descriptionText.trim().slice(0, 700)}`,
    liveResearch: false,
    model: "local-draft",
    notice: "Live company research did not run. This pack was written on this machine from Nigel's CV and the listing.",
  };
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
    liveResearch: false,
    model: "",
    error: null,
    createdAt: new Date().toISOString(),
    readyAt: null,
  };
}
