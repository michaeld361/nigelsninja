import Link from "next/link";
import { ApplyActions } from "@/components/apply-actions";
import { ApplyTabs } from "@/components/apply-tabs";
import { MarkApplied } from "@/components/mark-applied";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { RegeneratePage } from "@/components/regenerate-page";
import { RejectionNote } from "@/components/rejection-note";
import { StageSelect } from "@/components/stage-select";
import { formalLetter } from "@/lib/letter-plain";
import { isApplicationStage } from "@/lib/stages";
import { loadStore } from "@/lib/store";
import type { ApplyContact, HowToApply } from "@/lib/types";

export default async function ApplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  const pack = store.applyPacks.find((item) => item.jobId === id);
  if (!job || !pack) return <MissingJob />;
  const letter = pack.letterId ? store.letters.find((item) => item.id === pack.letterId) : null;
  const formatted = letter
    ? formalLetter(letter, store.settings, store.profile, { title: job.title, company: job.company }, contactLine(pack.contact))
    : null;
  const guide = asGuide(pack.howToApply, job.applyUrl || job.sources[0]?.url || "");
  const contact = asContact(pack.contact);
  const sources = pack.companySources || [];
  const notice = shownNotice(pack.error);
  return (
    <article className="rise">
      <RefreshWhilePreparing preparing={pack.state === "preparing"} />
      <Link href={isApplicationStage(job.status) ? "/applied" : "/apply"} className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← {isApplicationStage(job.status) ? "Applied" : "To apply"}
      </Link>
      <h1 className="display mt-6 text-[clamp(36px,10vw,52px)] leading-[0.92] break-words sm:text-[clamp(56px,8vw,96px)]">{job.company}</h1>
      <div className="mt-3 text-[22px] leading-snug break-words">{job.title}</div>
      <div className="mt-6">
        {isApplicationStage(job.status) ? <StageSelect jobId={job.id} stage={job.status} /> : <MarkApplied jobId={job.id} goTo="/applied" />}
        {job.status === "rejected" ? (
          <RejectionNote
            jobId={job.id}
            reason={store.learnings.find((item) => item.jobId === job.id)?.reason ?? ""}
            date={store.learnings.find((item) => item.jobId === job.id)?.at ?? null}
          />
        ) : null}
      </div>
      {notice && pack.state !== "failed" ? <p className="mt-6 max-w-xl text-sm leading-6 text-[rgba(242,241,236,0.6)]">{notice}</p> : null}
      {pack.state === "preparing" ? (
        <p className="mt-10 max-w-xl overflow-hidden font-[family-name:var(--font-bricolage)] text-[28px] leading-snug font-bold" aria-busy="true" aria-live="polite">
          <PreparingLine />
        </p>
      ) : null}
      {pack.state === "failed" ? (
        <div className="mt-10 max-w-xl">
          <p className="font-[family-name:var(--font-bricolage)] text-[28px] leading-snug font-bold">This letter stopped before it was ready.</p>
          {notice ? <p className="mt-3 text-sm text-[rgba(242,241,236,0.6)]">{notice}</p> : null}
          <div className="mt-6">
            <ApplyActions jobId={job.id} letterText="" letterId={null} retry />
          </div>
        </div>
      ) : null}
      {pack.state === "ready" && formatted ? (
        <>
          <RegeneratePage key={pack.readyAt ?? letter?.id ?? "ready"} jobId={job.id} readyAt={pack.readyAt} />
          <ApplyTabs
            key={letter?.id ?? "letter"}
            letter={formatted}
            letterId={letter?.id ?? null}
            wants={pack.lookingFor || []}
            steps={guide?.steps || []}
            url={guide?.url || ""}
            asks={guide?.asks || []}
            contact={contact}
            companyNote={pack.companyNote || ""}
            sources={sources}
          />
        </>
      ) : null}
    </article>
  );
}

function shownNotice(error: string | null): string | null {
  if (!error) return null;
  if (/too_big|Too big: expected array|"asks"/.test(error)) return null;
  return error;
}

function contactLine(contact: ApplyContact | string | null): string | null {
  const value = asContact(contact);
  if (!value) return typeof contact === "string" ? contact : null;
  if (!value.name && !value.email && !value.link) return value.none;
  return [value.name, value.email].filter(Boolean).join(", ");
}

function asGuide(value: HowToApply | string | null, url: string): HowToApply | null {
  if (!value) return null;
  if (typeof value === "string") return { steps: [value], url, asks: [] };
  return value;
}

function asContact(value: ApplyContact | string | null): ApplyContact | null {
  if (!value) return null;
  if (typeof value === "string") return { name: null, email: null, link: null, linkLabel: null, none: value };
  return value;
}
