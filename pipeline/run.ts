import { redactSecrets } from "@/lib/cron-auth";
import { RUN_LOCK_MS } from "@/lib/cron-wait";
import { RUN_CAPS } from "@/lib/defaults";
import { lowFitReason } from "@/lib/low-fit-reason";
import { loadStore, updateStore } from "@/lib/store";
import { statedContract } from "@/lib/text";
import type { FitAssessment, Job, Letter, Run, Settings, SourceId, Store } from "@/lib/types";
import { alreadyAppliedMatch } from "./applied";
import { takeCost } from "./llm";
import { lookbackSince } from "./lookback";
import { normaliseRaw } from "./normalise";
import { buildDigest, sendEmail } from "./notify";
import { PRACTISING_QUALIFICATION, prefilterJob } from "./prefilter";
import { applyRetention, expireListings } from "./retention";
import { scoreJob, type ScoreResult } from "./score";
import { searchJSearch } from "./sources/jsearch";
import { searchLinkedIn } from "./sources/linkedin";
import { searchReed } from "./sources/reed";
import type { SourceResult } from "./sources/types";
import { writeMarketNote } from "./market-note";
import { draftLetter } from "./write";

export const DEFAULT_SOURCES: SourceId[] = ["linkedin"];

const SEARCHERS = {
  linkedin: searchLinkedIn,
  reed: searchReed,
  jsearch: searchJSearch,
} as const;

export type RunOutcome = { ok: true; run: Run } | { ok: false; message: string };

function monthKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date(iso));
}

function spendThisMonth(store: Store): number {
  const key = monthKey(new Date().toISOString());
  return store.runs.filter((run) => run.finishedAt && monthKey(run.startedAt) === key).reduce((sum, run) => sum + run.estimatedCostUsd, 0);
}

function profileBlock(store: Store): string {
  return [store.profile.cvText, store.profile.linkedinSummary, store.profile.personalStatement].filter(Boolean).join("\n\n");
}

function enabledPhrases(settings: Settings): string[] {
  return settings.tiers.filter((tier) => tier.enabled).flatMap((tier) => tier.phrases);
}

export function claimRunLock(owner: string, holdExisting = false): boolean {
  return updateStore((store) => {
    const held = Boolean(store.runLock && new Date(store.runLock.until).getTime() > Date.now());
    if (held && !holdExisting) return false;
    if (!held) {
      store.runLock = { until: new Date(Date.now() + RUN_LOCK_MS).toISOString(), owner };
      store.searchFailure = null;
    }
    return true;
  });
}

export async function runPipeline(options: {
  trigger: "cron" | "manual";
  by: string;
  sources?: SourceId[];
  steadyBudget?: boolean;
  /** The caller already holds the lock, so this run must not refuse itself. */
  holdLock?: boolean;
}): Promise<RunOutcome> {
  const started = new Date();
  const locked = claimRunLock(options.by, Boolean(options.holdLock));
  if (!locked) return { ok: false, message: "A run is already in progress." };

  try {
    const snapshot = loadStore();
    const lookbackHours = lookbackSince(snapshot.runs, started.getTime());
    const phrases = enabledPhrases(snapshot.settings);
    const contractTypes = (Object.keys(snapshot.settings.contractTypes) as (keyof Settings["contractTypes"])[]).filter(
      (key) => snapshot.settings.contractTypes[key],
    );
    const params = {
      phrases,
      locations: snapshot.settings.locations,
      radiusMiles: snapshot.settings.radiusMiles,
      lookbackHours,
      contractTypes,
      steadyBudget: options.steadyBudget,
    };
    const sourceIds = options.sources ?? DEFAULT_SOURCES;
    const results: SourceResult[] = [];
    for (const id of sourceIds) {
      results.push(await SEARCHERS[id](params));
    }

    const counts: Run["counts"] = {
      linkedin: blank(false),
      reed: blank(false),
      jsearch: blank(false),
    };
    for (const id of sourceIds) counts[id] = blank(false);

    const warnings: string[] = [];
    const errors: string[] = [];
    const planned: { job: Job; fit?: ScoreResult; letter?: Letter; raw: { source: SourceId; externalId: string; payload: unknown } }[] = [];
    const seenKeys = new Set<string>();
    let scored = 0;
    let letters = 0;
    const ceilingHit = spendThisMonth(snapshot) >= snapshot.settings.monthlySpendCeilingUsd;
    const skipLettersReason = ceilingHit ? "Monthly spend ceiling reached. Scoring continued and letters were skipped." : null;

    const sourceMerges: { dedupeKey: string; url: string; source: Job["sources"][number] }[] = [];
    const backlogScored: { id: string; status: Job["status"]; fit: ScoreResult; letter?: Letter }[] = [];

    const candidates: { result: SourceResult; rawIndex: number }[] = [];
    for (const result of results) {
      counts[result.source].fetched = result.fetched;
      counts[result.source].demo = result.demo;
      counts[result.source].error = result.error;
      if (result.error) {
        errors.push(`${result.source}: ${result.error}`);
        warnings.push(`${label(result.source)} failed and was skipped. ${result.error}`);
      } else if (result.fetched === 0) {
        warnings.push(`${label(result.source)} returned zero results.`);
      }
      for (const note of result.capHits || []) warnings.push(note);
      if (result.demo) warnings.push(`${label(result.source)} used sample listings because its API key is not set.`);
      result.jobs.forEach((_, index) => candidates.push({ result, rawIndex: index }));
    }

    console.log(JSON.stringify({ event: "pipeline-score", candidates: candidates.length, lookbackHours }));
    const profile = profileBlock(snapshot);
    const waitingForScore = snapshot.jobs.filter((job) => {
      if (job.status === "unscored") return true;
      if (job.status !== "low_fit") return false;
      const fit = snapshot.fitAssessments
        .filter((item) => item.jobId === job.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return !lowFitReason(fit);
    });
    for (const waiting of waitingForScore) {
      if (scored >= RUN_CAPS.scored) break;
      const fit = await scoreJob(scoreInput(waiting), snapshot.settings, profile);
      scored += 1;
      const status = fit.score >= snapshot.settings.scoreThreshold && !fit.blockers.length ? "new" : "low_fit";
      const letter = status === "new" ? await maybeLetter(waiting, fit) : undefined;
      backlogScored.push({ id: waiting.id, status, fit, letter });
      waiting.status = status;
      counts.linkedin.scored += 1;
    }

    async function maybeLetter(job: Job, fit: ScoreResult): Promise<Letter | undefined> {
      if (letters >= RUN_CAPS.letters || skipLettersReason) return undefined;
      const draft = await draftLetter(
        {
          company: job.company,
          title: job.title,
          location: job.location,
          contractType: job.contractType,
          sourceLabel: job.sources[0]?.publisher || job.sources[0]?.source || "LinkedIn",
          description: job.descriptionText,
          letterNotes: job.letterNotes,
        },
        fit,
        snapshot.settings,
        profile,
      );
      letters += 1;
      return {
        id: `letter-${job.id}-1`,
        jobId: job.id,
        version: 1,
        model: draft.model,
        configuredWritingModel: draft.configuredWritingModel,
        promptVersion: draft.promptVersion,
        cvVersion: snapshot.profile.cvVersion,
        refLine: draft.refLine,
        salutation: draft.salutation,
        body: draft.body,
        signOff: draft.signOff,
        notesForNigel: draft.notesForNigel,
        unsupportedClaims: draft.unsupportedClaims,
        styleIssues: draft.styleIssues,
        wordCount: draft.wordCount,
        editedBody: null,
        disclaimerEnabled: null,
        state: "draft",
        origin: "generated",
        docxPath: null,
        createdAt: new Date().toISOString(),
      };
    }

    for (const item of candidates) {
      const raw = item.result.jobs[item.rawIndex];
      const normalised = normaliseRaw(raw, started.toISOString());
      const postingId = `job-${raw.source}-${raw.externalId}`;
      const existing = snapshot.jobs.find((job) => job.id === postingId || job.dedupeKey === normalised.dedupeKey);
      const alreadyPlanned = planned.find((item) => item.job.id === postingId || item.job.dedupeKey === normalised.dedupeKey);
      if (existing || alreadyPlanned || seenKeys.has(normalised.dedupeKey)) {
        counts[raw.source].duplicates += 1;
        const link = normalised.sources[0];
        const target = alreadyPlanned?.job ?? existing;
        if (target && link && !target.sources.some((current) => current.url === link.url)) {
          target.sources.push(link);
          if (existing && !alreadyPlanned) sourceMerges.push({ dedupeKey: existing.dedupeKey, url: link.url, source: link });
        }
        continue;
      }
      seenKeys.add(normalised.dedupeKey);
      if (
        alreadyAppliedMatch({
          postingId,
          applicationKey: normalised.applicationKey,
          now: started.getTime(),
          jobs: snapshot.jobs,
          applications: snapshot.applications,
        })
      ) {
        counts[raw.source].alreadyApplied += 1;
        continue;
      }
      const gate = prefilterJob(
        {
          ...normalised,
          description: normalised.descriptionText,
          contractExplicit: raw.contractType ?? statedContract(`${normalised.title}\n${normalised.descriptionText}`),
        },
        snapshot.settings,
      );
      const id = postingId;
      const job: Job = {
        ...normalised,
        id,
        europeRemote: gate.europeRemote,
        status: gate.keep ? "new" : "filtered",
        statusChangedAt: started.toISOString(),
        filteredReason: gate.reason,
        letterNotes: "",
        privateNote: "",
        deadline: null,
      };
      if (!gate.keep) {
        counts[raw.source].filtered += 1;
        if (gate.reason === PRACTISING_QUALIFICATION) counts[raw.source].practisingQualification += 1;
        planned.push({ job, raw: { source: raw.source, externalId: raw.externalId, payload: raw } });
        continue;
      }
      if (scored >= RUN_CAPS.scored) {
        job.status = "unscored";
        job.filteredReason = null;
        planned.push({ job, raw: { source: raw.source, externalId: raw.externalId, payload: raw } });
        continue;
      }
      const fit = await scoreJob(scoreInput(job), snapshot.settings, profile);
      scored += 1;
      counts[raw.source].scored += 1;
      job.status = fit.score >= snapshot.settings.scoreThreshold && !fit.blockers.length ? "new" : "low_fit";
      if (fit.blockers.length && fit.score >= snapshot.settings.scoreThreshold) job.status = "low_fit";
      const letter = job.status === "new" ? await maybeLetter(job, fit) : undefined;
      if (letter) counts[raw.source].letters += 1;
      counts[raw.source].new += 1;
      planned.push({ job, fit, letter, raw: { source: raw.source, externalId: raw.externalId, payload: raw } });
    }

    if (planned.some((item) => item.job.status === "unscored") || snapshot.jobs.some((job) => job.status === "unscored")) {
      warnings.push("Some roles are still unscored. They stay on the list for the next run.");
    }

    const finished = new Date();
    const worthALook =
      planned.filter((item) => item.job.status === "new").length + backlogScored.filter((item) => item.status === "new").length;
    const run: Run = {
      id: `run-${started.getTime()}`,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      trigger: options.trigger,
      by: options.by,
      lookbackHours,
      counts,
      totals: {
        fetched: sourceIds.reduce((sum, id) => sum + counts[id].fetched, 0),
        new: planned.filter((item) => item.job.status !== "filtered").length,
        filtered: planned.filter((item) => item.job.status === "filtered").length,
        scored,
        letters,
        worthALook,
      },
      errors,
      warnings: [...new Set(warnings)],
      estimatedCostUsd: takeCost(),
      lettersSkippedReason: skipLettersReason,
      digestHtml: null,
      digestSent: false,
    };

    const top = planned
      .filter((item) => item.fit && item.job.status === "new")
      .sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0))
      .slice(0, 5)
      .map((item) => ({ job: item.job, score: item.fit?.score ?? 0 }));
    run.digestHtml = buildDigest(run, top);

    updateStore((store) => {
      for (const update of backlogScored) {
        const job = store.jobs.find((item) => item.id === update.id);
        if (!job) continue;
        const from = job.status;
        job.status = update.status;
        job.filteredReason = null;
        job.statusChangedAt = finished.toISOString();
        store.fitAssessments.push({
          id: `fit-${job.id}-${finished.getTime()}`,
          jobId: job.id,
          model: update.fit.model,
          promptVersion: update.fit.promptVersion,
          score: update.fit.score,
          summary: update.fit.summary,
          matches: update.fit.matches,
          gaps: update.fit.gaps,
          blockers: update.fit.blockers,
          flags: update.fit.flags,
          seniorityFit: update.fit.seniorityFit,
          locationFit: update.fit.locationFit,
          salaryNote: update.fit.salaryNote,
          createdAt: finished.toISOString(),
        });
        if (update.letter) store.letters.push(update.letter);
        store.statusEvents.push({
          id: `event-backlog-${job.id}-${finished.getTime()}`,
          jobId: job.id,
          from,
          to: update.status,
          at: finished.toISOString(),
          by: "pipeline",
        });
      }
      for (const merge of sourceMerges) {
        const match = store.jobs.find((job) => job.dedupeKey === merge.dedupeKey);
        if (match && !match.sources.some((current) => current.url === merge.url)) match.sources.push(merge.source);
      }
      for (const item of planned) {
        const existing = store.jobs.find((job) => job.dedupeKey === item.job.dedupeKey);
        if (existing) {
          for (const link of item.job.sources) {
            if (!existing.sources.some((current) => current.url === link.url)) existing.sources.push(link);
          }
          continue;
        }
        store.jobs.push(item.job);
        if (item.fit) {
          const fit: FitAssessment = {
            id: `fit-${item.job.id}`,
            jobId: item.job.id,
            model: item.fit.model,
            promptVersion: item.fit.promptVersion,
            score: item.fit.score,
            summary: item.fit.summary,
            matches: item.fit.matches,
            gaps: item.fit.gaps,
            blockers: item.fit.blockers,
            flags: item.fit.flags,
            seniorityFit: item.fit.seniorityFit,
            locationFit: item.fit.locationFit,
            salaryNote: item.fit.salaryNote,
            createdAt: finished.toISOString(),
          };
          store.fitAssessments.push(fit);
        }
        if (item.letter) store.letters.push(item.letter);
        store.rawJobs.push({
          id: `raw-${item.job.id}`,
          runId: run.id,
          source: item.raw.source,
          externalId: item.raw.externalId,
          payload: item.raw.payload,
          storedAt: finished.toISOString(),
        });
        store.statusEvents.push({
          id: `event-${item.job.id}`,
          jobId: item.job.id,
          from: null,
          to: item.job.status,
          at: finished.toISOString(),
          by: "pipeline",
        });
      }
      if (snapshot.settings.digestEnabled && process.env.DIGEST_TO) {
        /* sent below after save, flag set here if we already know */
      }
      expireListings(store);
      applyRetention(store);
      store.runs.unshift(run);
      store.runLock = null;
      store.searchFailure = null;
    });

    if (snapshot.settings.digestEnabled) {
      const to = process.env.DIGEST_TO || "nigel@nigeldown.com";
      if (process.env.RESEND_API_KEY) {
        const sent = await sendEmail(to, `Job search: ${worthALook} worth a look`, run.digestHtml || "");
        updateStore((store) => {
          const saved = store.runs.find((item) => item.id === run.id);
          if (saved) saved.digestSent = sent.sent;
          if (!sent.sent && sent.error) saved?.warnings.push(`Digest not emailed: ${sent.error}`);
        });
        run.digestSent = sent.sent;
      }
    }
    if (errors.length && process.env.RESEND_API_KEY && process.env.ALERT_TO) {
      await sendEmail(process.env.ALERT_TO, "Job search source warning", `<p>${errors.join("<br>")}</p>`);
    }
    if (!counts.linkedin.error) {
      try {
        const note = await writeMarketNote(loadStore(), run.id);
        updateStore((store) => {
          store.marketNote = note;
        });
      } catch {
        /* The search is already saved. A missing note can be written on the next run. */
      }
    }
    return { ok: true, run: loadStore().runs.find((item) => item.id === run.id) || run };
  } catch (error) {
    const message = redactSecrets(error instanceof Error ? error.message : "The search did not finish.");
    updateStore((store) => {
      store.runLock = null;
      store.searchFailure = { at: new Date().toISOString(), message };
    });
    return { ok: false, message };
  }
}

function scoreInput(job: Job) {
  return {
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
  };
}

function blank(demo: boolean): Run["counts"]["linkedin"] {
  return { fetched: 0, new: 0, filtered: 0, scored: 0, letters: 0, duplicates: 0, alreadyApplied: 0, practisingQualification: 0, demo, error: null };
}

function label(source: SourceId): string {
  if (source === "reed") return "Reed.co.uk";
  if (source === "jsearch") return "JSearch";
  return "LinkedIn";
}

export function latestFit(store: Store, jobId: string): FitAssessment | undefined {
  return store.fitAssessments.filter((fit) => fit.jobId === jobId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function latestLetter(store: Store, jobId: string): Letter | undefined {
  return store.letters.filter((letter) => letter.jobId === jobId).sort((a, b) => b.version - a.version)[0];
}
