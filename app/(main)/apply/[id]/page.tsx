import Link from "next/link";
import { ApplyActions } from "@/components/apply-actions";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { plainLetter } from "@/lib/letter-plain";
import { loadStore } from "@/lib/store";

export default async function ApplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  const pack = store.applyPacks.find((item) => item.jobId === id);
  if (!job || !pack) return <MissingJob />;
  const letter = pack.letterId ? store.letters.find((item) => item.id === pack.letterId) : null;
  const letterText = letter ? plainLetter(letter, store.settings) : "";
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
      {pack.state === "ready" ? (
        <div className="mt-12 max-w-xl space-y-12">
          {pack.error ? <p className="text-sm leading-6 text-muted-foreground">{pack.error}</p> : null}
          <section>
            <h2 className="font-serif text-3xl tracking-tight">Letter</h2>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8">{letterText}</div>
            <div className="mt-4">
              <ApplyActions jobId={job.id} letterText={letterText} letterId={letter?.id ?? null} />
            </div>
          </section>
          <section>
            <h2 className="font-serif text-3xl tracking-tight">How to apply</h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8">{pack.howToApply}</p>
          </section>
          <section>
            <h2 className="font-serif text-3xl tracking-tight">Contact</h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8">{pack.contact}</p>
          </section>
          <section>
            <h2 className="font-serif text-3xl tracking-tight">The company</h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8">{pack.companyNote}</p>
          </section>
        </div>
      ) : null}
    </article>
  );
}
