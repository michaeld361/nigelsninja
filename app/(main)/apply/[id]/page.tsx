import Link from "next/link";
import { ApplyActions } from "@/components/apply-actions";
import { LetterSheet } from "@/components/letter-sheet";
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
          <p className="font-serif text-3xl leading-snug tracking-tight">This letter did not finish.</p>
          {notice ? <p className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}
          <div className="mt-6">
            <ApplyActions jobId={job.id} letterText="" letterId={null} retry />
          </div>
        </div>
      ) : null}
      {pack.state === "ready" && formatted ? (
        <div className="mt-16 max-w-2xl">
          {notice ? <p className="mb-16 text-sm leading-6 text-muted-foreground">{notice}</p> : null}
          <LetterSheet letter={formatted} letterId={letter?.id ?? null} />
          {pack.lookingFor?.length ? (
            <section className="mt-28 border-t pt-16">
              <h2 className="font-serif text-3xl tracking-tight">What they are looking for</h2>
              <ul className="mt-8 max-w-xl space-y-8">
                {pack.lookingFor.map((point) => (
                  <li key={point.want}>
                    <p className="text-base leading-8">{point.want}</p>
                    <p className="mt-2 text-base leading-8 text-muted-foreground">{point.show}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">How to apply</h2>
            {guide ? (
              <div className="mt-8 max-w-xl">
                <ol className="list-decimal space-y-3 pl-5 text-base leading-7">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {guide.url ? (
                  <p className="mt-8 text-sm leading-6">
                    <a className="underline decoration-foreground/30 underline-offset-4" href={guide.url}>
                      {guide.url}
                    </a>
                  </p>
                ) : null}
                {guide.asks.length ? (
                  <div className="mt-8">
                    <p className="text-sm text-muted-foreground">They ask for</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7">
                      {guide.asks.map((ask) => (
                        <li key={ask}>{ask}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">Contact</h2>
            <ContactBlock contact={contact} />
          </section>
          <section className="mt-28 border-t pt-16">
            <h2 className="font-serif text-3xl tracking-tight">The company</h2>
            <div className="mt-8 max-w-xl space-y-4 text-base leading-8">
              {(pack.companyNote || "").split(/\n\n+/).filter(Boolean).map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            {sources.length ? (
              <ul className="mt-6 max-w-xl space-y-2 text-sm leading-6 text-muted-foreground">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a className="underline decoration-foreground/20 underline-offset-4" href={source.url}>
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </article>
  );
}

function ContactBlock({ contact }: { contact: ApplyContact | null }) {
  if (!contact) return null;
  if (!contact.name && !contact.email && !contact.link) {
    return <p className="mt-8 max-w-xl text-base leading-8">{contact.none}</p>;
  }
  return (
    <div className="mt-8 max-w-xl space-y-2 text-base leading-8">
      {contact.name ? <p>{contact.name}</p> : null}
      {contact.email ? (
        <p>
          <a className="underline decoration-foreground/30 underline-offset-4" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </p>
      ) : null}
      {contact.link ? (
        <p>
          <a className="underline decoration-foreground/30 underline-offset-4" href={contact.link}>
            {contact.linkLabel || contact.link}
          </a>
        </p>
      ) : null}
    </div>
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
