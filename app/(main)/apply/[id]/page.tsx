import Link from "next/link";
import { ApplyActions } from "@/components/apply-actions";
import { LetterSheet } from "@/components/letter-sheet";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { formalLetter } from "@/lib/letter-plain";
import { loadStore } from "@/lib/store";

export default async function ApplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  const pack = store.applyPacks.find((item) => item.jobId === id);
  if (!job || !pack) return <MissingJob />;
  const letter = pack.letterId ? store.letters.find((item) => item.id === pack.letterId) : null;
  const formatted = letter
    ? formalLetter(letter, store.settings, store.profile, { title: job.title, company: job.company }, pack.contact)
    : null;
  return (
    <article>
      <RefreshWhilePreparing preparing={pack.state === "preparing"} />
      <Link href="/apply" className="text-sm text-muted-foreground">
        Apply list
      </Link>
      <h1 className="mt-4 font-serif text-5xl tracking-tight">{job.company}</h1>
      <p className="mt-2 text-xl">{job.title}</p>
      {pack.state === "preparing" ? (
        <p className="mt-10 max-w-xl font-serif text-3xl leading-snug tracking-tight" aria-busy="true" aria-live="polite">
          <PreparingLine />
        </p>
      ) : null}
      {pack.state === "failed" ? (
        <div className="mt-10 max-w-xl">
          <p className="font-serif text-3xl leading-snug tracking-tight">This one did not finish.</p>
          <p className="mt-3 text-sm text-muted-foreground">{pack.error}</p>
          <div className="mt-6">
            <ApplyActions jobId={job.id} letterText="" letterId={null} retry />
          </div>
        </div>
      ) : null}
      {pack.state === "ready" && formatted ? (
        <div className="mt-16 max-w-2xl">
          {pack.error ? <p className="mb-16 text-sm leading-6 text-muted-foreground">{pack.error}</p> : null}
          <LetterSheet letter={formatted} letterId={letter?.id ?? null} />
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">How to apply</h2>
            <p className="mt-6 max-w-xl whitespace-pre-wrap text-base leading-8">{pack.howToApply}</p>
          </section>
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">Contact</h2>
            <p className="mt-6 max-w-xl whitespace-pre-wrap text-base leading-8">{pack.contact}</p>
          </section>
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">The company</h2>
            <p className="mt-6 max-w-xl whitespace-pre-wrap text-base leading-8">{pack.companyNote}</p>
          </section>
        </div>
      ) : null}
    </article>
  );
}
