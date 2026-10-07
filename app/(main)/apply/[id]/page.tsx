import Link from "next/link";
import { ApplyActions } from "@/components/apply-actions";
import { ApplyTabs } from "@/components/apply-tabs";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { formalLetter } from "@/lib/letter-plain";
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
      <Link href="/apply" className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← Apply list
      </Link>
      <h1 className="display mt-6 text-[clamp(56px,8vw,96px)] leading-[0.92]">{job.company}</h1>
      <div className="mt-3 text-[22px]">{job.title}</div>
      {notice && pack.state !== "failed" ? <p className="mt-6 max-w-xl text-sm leading-6 text-[rgba(242,241,236,0.6)]">{notice}</p> : null}
      {pack.state === "preparing" ? (
        <p className="mt-10 max-w-xl font-[family-name:var(--font-bricolage)] text-[28px] leading-snug font-bold" aria-busy="true" aria-live="polite">
          <PreparingLine />
        </p>
      ) : null}
      {pack.state === "failed" ? (
        <div className="mt-10 max-w-xl">
          <p className="font-[family-name:var(--font-bricolage)] text-[28px] leading-snug font-bold">This letter did not finish.</p>
          {notice ? <p className="mt-3 text-sm text-[rgba(242,241,236,0.6)]">{notice}</p> : null}
          <div className="mt-6">
            <ApplyActions jobId={job.id} letterText="" letterId={null} retry />
          </div>
        </div>
      ) : null}
      {pack.state === "ready" && formatted ? (
        <ApplyTabs
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
