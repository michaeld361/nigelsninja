"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { clearSessionCookie, createSession, findAllowed, getSession, sessionCookie } from "@/lib/auth";
import { defaultSettings } from "@/lib/defaults";
import { dataDir, emptyStore, loadStore, updateStore } from "@/lib/store";
import type { ContractType, JobStatus, KeywordTier } from "@/lib/types";
import { isApplicationStage, STAGE_LABEL, type ApplicationStage } from "@/lib/stages";
import { rememberLearning, rememberNote, weighingText } from "@/lib/weighing";
import { createPreparingPack, finishApplyPack } from "@/pipeline/apply-pack";
import { claimRunLock, runPipeline } from "@/pipeline/run";
import { draftLetter } from "@/pipeline/write";
import { latestFit } from "@/pipeline/run";

export type ActionResult = { ok: true; message?: string; link?: string } | { ok: false; message: string };

async function actor() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function signInWithEmail(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") || "");
  const user = findAllowed(email);
  if (!user) {
    return { ok: false, message: "That email is not one this site can sign in." };
  }
  const token = crypto.randomUUID();
  updateStore((store) => {
    store.magicLinks.push({
      token,
      email: user.email,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    });
  });
  const link = `/login/consume?token=${token}`;
  if (!process.env.RESEND_API_KEY) return { ok: true, link };
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  if (!base || /127\.0\.0\.1|localhost/i.test(base)) return { ok: true, link, message: "The email was not sent." };
  try {
    const { sendEmail } = await import("@/pipeline/notify");
    const { magicLinkEmail } = await import("@/pipeline/brand-email");
    const mail = magicLinkEmail(`${base}${link}`);
    const sent = await sendEmail(user.email, mail.subject, mail.html);
    if (sent.sent && sent.id) return { ok: true, message: `The sign-in link is on its way to ${user.email}.` };
    return { ok: true, link, message: sent.error || "The email was not sent." };
  } catch {
    return { ok: true, link, message: "The email was not sent." };
  }
}

export async function consumeMagicLink(token: string) {
  const link = loadStore().magicLinks.find((item) => item.token === token && !item.used);
  if (!link || new Date(link.expiresAt).getTime() < Date.now()) return null;
  const user = findAllowed(link.email);
  if (!user) return null;
  updateStore((store) => {
    const row = store.magicLinks.find((item) => item.token === token);
    if (row) row.used = true;
  });
  const session = createSession(user.email);
  if (!session) return null;
  const jar = await cookies();
  const cookie = sessionCookie(session.id);
  jar.set(cookie.name, cookie.value, cookie.options);
  return session;
}

export async function signOut() {
  const session = await getSession();
  if (session) {
    updateStore((store) => {
      store.sessions = store.sessions.filter((item) => item.id !== session.id);
    });
  }
  const jar = await cookies();
  const cookie = clearSessionCookie();
  jar.set(cookie.name, cookie.value, cookie.options);
  redirect("/login");
}

export async function signOutEverywhere() {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." } satisfies ActionResult;
  updateStore((store) => {
    store.sessions = store.sessions.filter((item) => item.email !== session.email);
  });
  const jar = await cookies();
  const cookie = clearSessionCookie();
  jar.set(cookie.name, cookie.value, cookie.options);
  redirect("/login");
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const missing = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return true;
    const from = job.status;
    job.status = status;
    job.statusChangedAt = new Date().toISOString();
    store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: status, at: job.statusChangedAt, by: session.email });
    if (status === "applied" && !store.applications.some((item) => item.jobId === jobId)) {
      store.applications.push({
        id: crypto.randomUUID(),
        jobId,
        company: job.company,
        title: job.title,
        applicationKey: job.applicationKey,
        appliedAt: job.statusChangedAt,
        outcome: null,
        outcomeAt: null,
      });
    }
    return false;
  });
  if (missing) return { ok: false, message: "That role is no longer in the queue." };
  revalidatePath("/today");
  revalidatePath("/pipeline");
  revalidatePath("/jobs");
  revalidatePath("/low-fit");
  revalidatePath("/filtered");
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function bulkSkip(ids: string[]): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  updateStore((store) => {
    for (const jobId of ids) {
      const job = store.jobs.find((item) => item.id === jobId);
      if (!job) continue;
      const from = job.status;
      job.status = "skipped";
      job.statusChangedAt = new Date().toISOString();
      store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: "skipped", at: job.statusChangedAt, by: session.email });
    }
  });
  revalidatePath("/pipeline");
  revalidatePath("/today");
  return { ok: true, message: `Skipped ${ids.length}.` };
}

export async function saveJobFields(jobId: string, fields: { letterNotes?: string; privateNote?: string; deadline?: string | null; editedBody?: string; disclaimerEnabled?: boolean }) {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." } satisfies ActionResult;
  updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return;
    if (fields.letterNotes !== undefined) job.letterNotes = fields.letterNotes;
    if (fields.privateNote !== undefined) job.privateNote = fields.privateNote;
    if (fields.deadline !== undefined) job.deadline = fields.deadline || null;
    if (fields.editedBody !== undefined || fields.disclaimerEnabled !== undefined) {
      const letter = store.letters.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version)[0];
      if (letter) {
        if (fields.editedBody !== undefined) {
          letter.editedBody = fields.editedBody;
          letter.state = "reviewed";
        }
        if (fields.disclaimerEnabled !== undefined) letter.disclaimerEnabled = fields.disclaimerEnabled;
      }
    }
  });
  return { ok: true } satisfies ActionResult;
}

export async function markLetterReviewed(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  updateStore((store) => {
    const letter = store.letters.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version)[0];
    if (letter) letter.state = "reviewed";
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/today");
  return { ok: true };
}

export async function regenerateLetter(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job) return { ok: false, message: "That role is no longer in the queue." };
  const fit = latestFit(store, jobId);
  if (!fit) return { ok: false, message: "This role has not been scored yet." };
  const profile = [store.profile.cvText, store.profile.linkedinSummary, store.profile.personalStatement].join("\n\n");
  const draft = await draftLetter(
    {
      company: job.company,
      title: job.title,
      location: job.location,
      contractType: job.contractType,
      sourceLabel: job.sources[0]?.publisher || job.sources[0]?.source || "the board",
      description: job.descriptionText,
      letterNotes: job.letterNotes,
    },
    {
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
    },
    store.settings,
    profile,
    weighingText(store.notes, store.learnings),
  );
  updateStore((current) => {
    const versions = current.letters.filter((item) => item.jobId === jobId);
    const next = versions.reduce((max, item) => Math.max(max, item.version), 0) + 1;
    current.letters.push({
      id: crypto.randomUUID(),
      jobId,
      version: next,
      model: draft.model,
      configuredWritingModel: draft.configuredWritingModel,
      promptVersion: draft.promptVersion,
      cvVersion: current.profile.cvVersion,
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
    });
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/today");
  return { ok: true, message: draft.styleIssues.length ? `Draft saved with a style flag: ${draft.styleIssues[0]}` : "New draft saved. Your earlier versions are still here." };
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  updateStore((store) => {
    store.profile.linkedinSummary = String(formData.get("linkedin") || "");
    store.profile.personalStatement = String(formData.get("statement") || "");
    store.profile.updatedAt = new Date().toISOString();
    store.settings.homePostcode = String(formData.get("postcode") || store.settings.homePostcode);
    store.settings.radiusMiles = Number(formData.get("radius") || store.settings.radiusMiles);
    store.settings.scoreThreshold = Number(formData.get("threshold") || store.settings.scoreThreshold);
    store.settings.standingNotes = String(formData.get("standing") || "");
    store.settings.digestEnabled = formData.get("digest") === "on";
    store.settings.disclaimerEnabled = formData.get("disclaimerOn") === "on";
    store.settings.disclaimerText = String(formData.get("disclaimer") || store.settings.disclaimerText);
    store.settings.monthlySpendCeilingUsd = Number(formData.get("ceiling") || store.settings.monthlySpendCeilingUsd);
    const contracts: ContractType[] = ["permanent", "fixed-term", "contract", "part-time", "freelance"];
    for (const contract of contracts) store.settings.contractTypes[contract] = formData.get(`contract-${contract}`) === "on";
    const tiers: KeywordTier["id"][] = ["core", "adjacent", "stretch"];
    for (const id of tiers) {
      const tier = store.settings.tiers.find((item) => item.id === id);
      if (!tier) continue;
      tier.enabled = formData.get(`tier-${id}`) === "on";
      tier.phrases = String(formData.get(`phrases-${id}`) || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
  });
  revalidatePath("/settings");
  return { ok: true, message: "Saved. Search changes apply on the next run." };
}

export async function uploadCv(formData: FormData): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CV file." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "CV files must be under 5 MB." };
  const name = file.name.toLowerCase();
  if (!name.endsWith(".docx") && !name.endsWith(".pdf")) return { ok: false, message: "Upload a .docx or .pdf." };
  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    text = result.value.trim();
  } else {
    return { ok: false, message: "PDF text extraction is not available in this build. Upload the CV as .docx." };
  }
  if (text.length < 200) return { ok: false, message: "That file did not contain enough CV text." };
  const version = updateStore((store) => {
    const next = store.profile.cvVersion + 1;
    if (store.profile.cvText) {
      store.profile.cvHistory.push({
        version: store.profile.cvVersion,
        text: store.profile.cvText,
        filename: store.profileFiles.find((item) => item.kind === "cv" && item.version === store.profile.cvVersion)?.filename || "previous.docx",
        uploadedAt: store.profile.updatedAt,
      });
    }
    const relative = path.join("data", "files", `cv-v${next}.docx`);
    fs.mkdirSync(path.join(dataDir(), "files"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), relative), bytes);
    store.profile.cvText = text;
    store.profile.cvVersion = next;
    store.profile.updatedAt = new Date().toISOString();
    store.profileFiles.push({
      id: crypto.randomUUID(),
      storagePath: relative,
      filename: file.name,
      kind: "cv",
      version: next,
      uploadedAt: store.profile.updatedAt,
      label: `CV version ${next}`,
    });
    return next;
  });
  revalidatePath("/settings");
  return { ok: true, message: `CV saved as version ${version}.` };
}

export async function deleteAllData(formData: FormData): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  if (String(formData.get("confirm")) !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };
  updateStore((store) => {
    const users = store.allowedUsers;
    const fresh = emptyStore();
    fresh.allowedUsers = users;
    fresh.settings = defaultSettings();
    fresh.sessions = store.sessions.filter((item) => item.email === session.email);
    Object.assign(store, fresh);
  });
  const files = path.join(dataDir(), "files");
  if (fs.existsSync(files)) fs.rmSync(files, { recursive: true, force: true });
  revalidatePath("/", "layout");
  return { ok: true, message: "Your data has been deleted. The allow-list is unchanged." };
}

function publicError(message: string): string {
  let text = message;
  for (const secret of [process.env.APIFY_TOKEN, process.env.ANTHROPIC_API_KEY, process.env.RESEND_API_KEY]) {
    if (secret) text = text.split(secret).join("");
  }
  text = text.replace(/apify_api_[A-Za-z0-9]+/g, "").replace(/sk-ant-[A-Za-z0-9_-]+/g, "").replace(/\s+/g, " ").trim();
  return text || "LinkedIn search failed.";
}

export async function runLinkedInSearch(): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  if (!claimRunLock(session.email)) return { ok: false, message: "A run is already in progress." };
  after(() => runPipeline({ trigger: "manual", by: session.email, sources: ["linkedin"], steadyBudget: true, holdLock: true }));
  return { ok: true };
}

export async function savePersonalNote(id: string | null, text: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const saved = updateStore((store) => {
    const result = rememberNote(store.notes, { id, text, now: new Date().toISOString() });
    if (!result.saved) return false;
    store.notes = result.notes;
    return true;
  });
  if (!saved) return { ok: false, message: "Write the note first." };
  revalidatePath("/settings");
  return { ok: true, message: "Saved. The next letter and the next search will weigh it." };
}

export async function saveRejectionReason(jobId: string, reason: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const outcome = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return "missing" as const;
    if (job.status !== "rejected") return "early" as const;
    const result = rememberLearning(store.learnings, {
      jobId,
      company: job.company,
      title: job.title,
      reason,
      now: new Date().toISOString(),
    });
    if (!result.saved) return "empty" as const;
    store.learnings = result.learnings;
    return "ok" as const;
  });
  if (outcome === "missing") return { ok: false, message: "That role is no longer here." };
  if (outcome === "early") return { ok: false, message: "Set the stage to Rejected first." };
  if (outcome === "empty") return { ok: false, message: "Write why it was unsuccessful." };
  revalidatePath("/settings");
  revalidatePath("/applied");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/apply/${jobId}`);
  return { ok: true, message: "Saved. The next letter and the next search will weigh it." };
}

export async function saveLearningReason(id: string, reason: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const outcome = updateStore((store) => {
    const current = store.learnings.find((item) => item.id === id);
    if (!current) return "missing" as const;
    const result = rememberLearning(store.learnings, {
      jobId: current.jobId,
      company: current.company,
      title: current.title,
      reason,
      now: new Date().toISOString(),
    });
    if (!result.saved) return "empty" as const;
    store.learnings = result.learnings;
    return "ok" as const;
  });
  if (outcome === "missing") return { ok: false, message: "That learning is no longer here." };
  if (outcome === "empty") return { ok: false, message: "Write why it was unsuccessful." };
  revalidatePath("/settings");
  revalidatePath("/applied");
  return { ok: true, message: "Saved. The next letter and the next search will weigh it." };
}

export async function markApplied(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const missing = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return true;
    const now = new Date().toISOString();
    if (!isApplicationStage(job.status)) {
      const from = job.status;
      job.status = "applied";
      job.statusChangedAt = now;
      store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: "applied", at: now, by: session.email });
    }
    const existing = store.applications.find((item) => item.jobId === jobId);
    if (!existing) {
      store.applications.push({
        id: crypto.randomUUID(),
        jobId,
        company: job.company,
        title: job.title,
        applicationKey: job.applicationKey,
        appliedAt: job.statusChangedAt,
        outcome: "Applied",
        outcomeAt: job.statusChangedAt,
      });
    } else if (!existing.outcome) {
      existing.outcome = "Applied";
      existing.outcomeAt = existing.outcomeAt || job.statusChangedAt;
    }
    return false;
  });
  if (missing) return { ok: false, message: "That role is no longer here." };
  revalidatePath("/apply");
  revalidatePath("/applied");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/apply/${jobId}`);
  return { ok: true };
}

export async function setApplicationStage(jobId: string, stage: ApplicationStage): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  if (!isApplicationStage(stage)) return { ok: false, message: "That stage is not one of these." };
  const missing = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return "missing" as const;
    if (!isApplicationStage(job.status)) return "early" as const;
    const now = new Date().toISOString();
    const from = job.status;
    job.status = stage;
    job.statusChangedAt = now;
    if (from !== stage) {
      store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: stage, at: now, by: session.email });
    }
    const existing = store.applications.find((item) => item.jobId === jobId);
    if (existing) {
      existing.outcome = STAGE_LABEL[stage];
      existing.outcomeAt = now;
    } else {
      store.applications.push({
        id: crypto.randomUUID(),
        jobId,
        company: job.company,
        title: job.title,
        applicationKey: job.applicationKey,
        appliedAt: now,
        outcome: STAGE_LABEL[stage],
        outcomeAt: now,
      });
    }
    return "ok" as const;
  });
  if (missing === "missing") return { ok: false, message: "That role is no longer here." };
  if (missing === "early") return { ok: false, message: "Mark it Applied first." };
  revalidatePath("/applied");
  revalidatePath("/apply");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/apply/${jobId}`);
  return { ok: true };
}

export async function linkedInSearchStatus(): Promise<{ searching: boolean; error: string | null }> {
  const session = await actor();
  if (!session) return { searching: false, error: "Sign in again." };
  const store = loadStore();
  const searching = Boolean(store.runLock && new Date(store.runLock.until).getTime() > Date.now());
  if (searching) return { searching: true, error: null };
  const message = store.searchFailure?.message || null;
  return { searching: false, error: message ? publicError(message) : null };
}

export async function runNow(source?: "linkedin" | "reed" | "jsearch"): Promise<ActionResult> {
  const session = await actor();
  if (!session || session.role !== "admin") return { ok: false, message: "Only Michael can run the pipeline." };
  const result = await runPipeline({ trigger: "manual", by: session.email, sources: source ? [source] : undefined });
  revalidatePath("/admin");
  revalidatePath("/today");
  revalidatePath("/pipeline");
  if (!result.ok) return { ok: false, message: publicError(result.message) };
  return { ok: true, message: `Run finished. ${result.run.totals.worthALook} worth a look.` };
}

export async function retryLetters(): Promise<ActionResult> {
  const session = await actor();
  if (!session || session.role !== "admin") return { ok: false, message: "Only Michael can retry letters." };
  const store = loadStore();
  const pending = store.jobs.filter((job) => {
    const fit = store.fitAssessments.find((item) => item.jobId === job.id);
    const hasLetter = store.letters.some((item) => item.jobId === job.id);
    return fit && fit.score >= store.settings.scoreThreshold && !fit.blockers.length && !hasLetter && job.status !== "filtered";
  });
  for (const job of pending) await regenerateLetter(job.id);
  revalidatePath("/admin");
  return { ok: true, message: pending.length ? `Drafted ${pending.length} letter${pending.length === 1 ? "" : "s"}.` : "No failed letters to retry." };
}

export async function restoreJob(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const missing = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return true;
    const from = job.status;
    job.status = "new";
    job.statusChangedAt = new Date().toISOString();
    store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: "new", at: job.statusChangedAt, by: session.email });
    return false;
  });
  if (missing) return { ok: false, message: "That role is not in the queue." };
  revalidatePath("/jobs");
  revalidatePath("/skipped");
  revalidatePath(`/jobs/${jobId}`);
  redirect("/jobs");
}

export async function skipJob(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const missing = updateStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return true;
    const from = job.status;
    job.status = "skipped";
    job.statusChangedAt = new Date().toISOString();
    store.statusEvents.push({ id: crypto.randomUUID(), jobId, from, to: "skipped", at: job.statusChangedAt, by: session.email });
    return false;
  });
  if (missing) return { ok: false, message: "That role is not in the queue." };
  revalidatePath("/jobs");
  revalidatePath("/skipped");
  revalidatePath(`/jobs/${jobId}`);
  redirect("/skipped");
}

export async function addToApplyList(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job) return { ok: false, message: "That role is not in the queue." };
  const existing = store.applyPacks.find((item) => item.jobId === jobId);
  if (!existing) {
    updateStore((next) => {
      if (next.applyPacks.some((item) => item.jobId === jobId)) return;
      next.applyPacks.unshift(createPreparingPack(jobId));
    });
    after(() => finishApplyPack(jobId));
  } else if (existing.state === "failed") {
    updateStore((next) => {
      const row = next.applyPacks.find((item) => item.jobId === jobId);
      if (!row) return;
      row.state = "preparing";
      row.error = null;
    });
    after(() => finishApplyPack(jobId));
  }
  revalidatePath("/jobs");
  revalidatePath("/apply");
  redirect(`/apply/${jobId}`);
}

export async function regenerateApplyPack(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const outcome = updateStore((store) => {
    const row = store.applyPacks.find((item) => item.jobId === jobId);
    if (!row) return "missing" as const;
    if (row.state === "preparing") return "busy" as const;
    row.state = "preparing";
    row.error = null;
    row.readyAt = null;
    return "started" as const;
  });
  if (outcome === "missing") return { ok: false, message: "That role is not on the apply list." };
  if (outcome === "started") after(() => finishApplyPack(jobId));
  revalidatePath(`/apply/${jobId}`);
  return { ok: true };
}

export async function retryApplyPack(jobId: string): Promise<ActionResult> {
  const session = await actor();
  if (!session) return { ok: false, message: "Sign in again." };
  const found = updateStore((store) => {
    const row = store.applyPacks.find((item) => item.jobId === jobId);
    if (!row) return false;
    row.state = "preparing";
    row.error = null;
    row.readyAt = null;
    return true;
  });
  if (!found) return { ok: false, message: "That role is not on the apply list." };
  after(() => finishApplyPack(jobId));
  revalidatePath(`/apply/${jobId}`);
  return { ok: true };
}
