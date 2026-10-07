"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markLetterReviewed, regenerateLetter, saveJobFields, setJobStatus } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { plainLetter } from "@/lib/letter-plain";
import { STATUS_LABEL } from "@/lib/format";
import type { FitAssessment, Job, JobStatus, Letter, Settings } from "@/lib/types";
import { toast } from "sonner";

const STATUSES: JobStatus[] = ["new", "low_fit", "shortlisted", "applied", "interview", "offer", "rejected", "skipped", "filtered", "expired"];

export function JobDetail({
  job,
  fit,
  letters,
  settings,
}: {
  job: Job;
  fit: FitAssessment | null;
  letters: Letter[];
  settings: Settings;
}) {
  const latest = letters[0];
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState(latest?.editedBody ?? latest?.body.join("\n\n") ?? "");
  const [notes, setNotes] = useState(job.letterNotes);
  const [privateNote, setPrivateNote] = useState(job.privateNote);
  const [deadline, setDeadline] = useState(job.deadline ?? "");
  const [disclaimer, setDisclaimer] = useState(latest?.disclaimerEnabled ?? settings.disclaimerEnabled);
  const [viewId, setViewId] = useState(latest?.id ?? "");
  const dirty = useRef(false);
  const letterKey = latest?.id ?? "";
  const [trackedLetter, setTrackedLetter] = useState(letterKey);
  if (letterKey !== trackedLetter) {
    setTrackedLetter(letterKey);
    setBody(latest?.editedBody ?? latest?.body.join("\n\n") ?? "");
    setViewId(letterKey);
    setDisclaimer(latest?.disclaimerEnabled ?? settings.disclaimerEnabled);
  }

  const seenLetter = useRef(letterKey);
  useEffect(() => {
    if (seenLetter.current !== letterKey) {
      seenLetter.current = letterKey;
      dirty.current = false;
      return;
    }
    if (!dirty.current || !latest || viewId !== latest.id) return;
    const handle = setTimeout(() => {
      dirty.current = false;
      void saveJobFields(job.id, { editedBody: body, letterNotes: notes, privateNote, deadline: deadline || null, disclaimerEnabled: disclaimer });
    }, 700);
    return () => clearTimeout(handle);
  }, [body, notes, privateNote, deadline, disclaimer, job.id, latest, viewId, letterKey]);

  const viewing = letters.find((letter) => letter.id === viewId) ?? latest;
  const readOnly = viewing && latest && viewing.id !== latest.id;

  function mark<T>(setter: (value: T) => void) {
    return (value: T) => {
      dirty.current = true;
      setter(value);
    };
  }

  function status(next: JobStatus) {
    start(async () => {
      const result = await setJobStatus(job.id, next);
      if (!result.ok) toast.error(result.message);
      else router.refresh();
    });
  }

  async function copy() {
    if (!latest) return;
    const text = plainLetter(
      { ...latest, editedBody: body, disclaimerEnabled: disclaimer },
      settings,
    );
    await navigator.clipboard.writeText(text);
    await markLetterReviewed(job.id);
    toast.success("Copied. The draft is marked reviewed.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/today" className="text-xs text-muted-foreground underline">
            Back to Today
          </Link>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">{job.title}</h1>
          <p className="text-sm">
            {job.company} · {job.location}
            {job.demo ? " · Sample listing" : ""}
          </p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            className="h-9 rounded-lg border bg-background px-2"
            value={job.status}
            onChange={(event) => status(event.target.value as JobStatus)}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <Spec job={job} fit={fit} />
        <LetterPanel
          job={job}
          latest={latest}
          viewing={viewing}
          letters={letters}
          body={body}
          setBody={mark(setBody)}
          notes={notes}
          setNotes={mark(setNotes)}
          privateNote={privateNote}
          setPrivateNote={mark(setPrivateNote)}
          deadline={deadline}
          setDeadline={mark(setDeadline)}
          disclaimer={disclaimer}
          setDisclaimer={mark(setDisclaimer)}
          readOnly={Boolean(readOnly)}
          pending={pending}
          settings={settings}
          onCopy={copy}
          onView={setViewId}
          onRegenerate={() =>
            start(async () => {
              const result = await regenerateLetter(job.id);
              if (!result.ok) toast.error(result.message);
              else {
                toast.success(result.message ?? "Draft saved");
                router.refresh();
              }
            })
          }
        />
      </div>

      <div className="md:hidden">
        <Tabs defaultValue="letter">
          <TabsList className="w-full">
            <TabsTrigger value="spec">Spec</TabsTrigger>
            <TabsTrigger value="fit">Fit</TabsTrigger>
            <TabsTrigger value="letter">Letter</TabsTrigger>
          </TabsList>
          <TabsContent value="spec" className="pt-4">
            <Spec job={job} fit={null} />
          </TabsContent>
          <TabsContent value="fit" className="pt-4">
            <FitBlock fit={fit} />
          </TabsContent>
          <TabsContent value="letter" className="pt-4">
            <LetterPanel
              job={job}
              latest={latest}
              viewing={viewing}
              letters={letters}
              body={body}
              setBody={mark(setBody)}
              notes={notes}
              setNotes={mark(setNotes)}
              privateNote={privateNote}
              setPrivateNote={mark(setPrivateNote)}
              deadline={deadline}
              setDeadline={mark(setDeadline)}
              disclaimer={disclaimer}
              setDisclaimer={mark(setDisclaimer)}
              readOnly={Boolean(readOnly)}
              pending={pending}
              settings={settings}
              onCopy={copy}
              onView={setViewId}
              onRegenerate={() =>
                start(async () => {
                  const result = await regenerateLetter(job.id);
                  if (!result.ok) toast.error(result.message);
                  else {
                    toast.success(result.message ?? "Draft saved");
                    router.refresh();
                  }
                })
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Spec({ job, fit }: { job: Job; fit: FitAssessment | null }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {job.sources.map((source) => (
          <a key={source.url} className="underline" href={source.url} target="_blank" rel="noreferrer">
            {source.source === "reed" ? "via Reed.co.uk" : source.publisher || source.source}
          </a>
        ))}
      </div>
      {job.filteredReason ? <p className="text-sm text-muted-foreground">Filtered: {job.filteredReason}</p> : null}
      <article className="whitespace-pre-wrap text-sm leading-6">{job.descriptionText}</article>
      {fit ? (
        <div className="hidden md:block">
          <FitBlock fit={fit} />
        </div>
      ) : null}
    </div>
  );
}

function FitBlock({ fit }: { fit: FitAssessment | null }) {
  if (!fit) return <p className="text-sm text-muted-foreground">This role has not been scored.</p>;
  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <p className="text-sm font-medium">Fit {fit.score}</p>
      <p className="text-sm leading-6">{fit.summary}</p>
      {fit.blockers.map((item) => (
        <p key={item} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {item}
        </p>
      ))}
      <p className="text-sm"><span className="text-muted-foreground">Matches. </span>{fit.matches.join(", ") || "None recorded."}</p>
      <p className="text-sm"><span className="text-muted-foreground">Gaps. </span>{fit.gaps.join(", ") || "None recorded."}</p>
      <p className="text-sm text-muted-foreground">{fit.locationFit} {fit.salaryNote}</p>
    </div>
  );
}

function LetterPanel(props: {
  job: Job;
  latest?: Letter;
  viewing?: Letter;
  letters: Letter[];
  body: string;
  setBody: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  privateNote: string;
  setPrivateNote: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  disclaimer: boolean;
  setDisclaimer: (value: boolean) => void;
  readOnly: boolean;
  pending: boolean;
  settings: Settings;
  onCopy: () => void;
  onView: (id: string) => void;
  onRegenerate: () => void;
}) {
  if (!props.latest) {
    return (
      <div className="rounded-2xl border border-dashed p-4 text-sm">
        <p>No letter yet. Low fit roles wait until you ask.</p>
        <Button className="mt-3" disabled={props.pending} onClick={props.onRegenerate}>
          {props.pending ? "Drafting…" : "Request a letter"}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{props.latest.state === "reviewed" ? "Reviewed" : "Draft"}</Badge>
        <span className="text-xs text-muted-foreground">
          {props.latest.wordCount} words · {props.latest.model} · CV v{props.latest.cvVersion} · {props.latest.promptVersion}
        </span>
      </div>
      {props.latest.unsupportedClaims.length ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">Check this: {props.latest.unsupportedClaims.join(" ")}</p>
      ) : null}
      {props.latest.styleIssues.length ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm">Style flag: {props.latest.styleIssues.join(" ")}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">{props.latest.notesForNigel}</p>
      {props.readOnly && props.viewing ? (
        <div className="whitespace-pre-wrap rounded-xl bg-muted p-3 font-serif text-sm leading-6">{props.viewing.body.join("\n\n")}</div>
      ) : (
        <Textarea className="min-h-80 font-serif text-sm leading-6" value={props.body} onChange={(event) => props.setBody(event.target.value)} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={props.onCopy} disabled={props.readOnly}>
          Copy letter
        </Button>
        <Button size="sm" variant="outline" render={<a href={`/api/letters/${props.latest.id}/docx`} />}>
          Download .docx
        </Button>
        <Button size="sm" variant="secondary" disabled={props.pending} onClick={props.onRegenerate}>
          {props.pending ? "Drafting…" : "Regenerate"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Edits save on their own. Regenerate keeps this version and writes a new one.</p>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="disclaimer">AI disclaimer on this letter</Label>
        <Switch id="disclaimer" checked={props.disclaimer} onCheckedChange={props.setDisclaimer} />
      </div>
      <label className="block text-sm">
        Notes for this letter
        <Textarea className="mt-1" value={props.notes} onChange={(event) => props.setNotes(event.target.value)} />
      </label>
      <label className="block text-sm">
        Private note
        <Textarea className="mt-1" value={props.privateNote} onChange={(event) => props.setPrivateNote(event.target.value)} />
      </label>
      <label className="block text-sm">
        Deadline
        <input className="mt-1 block h-9 rounded-lg border bg-background px-2" type="date" value={props.deadline} onChange={(event) => props.setDeadline(event.target.value)} />
      </label>
      {props.letters.length > 1 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {props.letters.map((letter) => (
            <button key={letter.id} type="button" className="underline" onClick={() => props.onView(letter.id)}>
              v{letter.version} {letter.state}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
