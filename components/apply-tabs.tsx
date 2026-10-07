"use client";

import { useState } from "react";
import { LetterSheet } from "@/components/letter-sheet";
import type { FormalLetter } from "@/lib/letter-plain";
import type { ApplyContact, CompanySource, SpecPoint } from "@/lib/types";

const TABS = [
  { id: "letter", label: "Letter" },
  { id: "want", label: "What they want" },
  { id: "how", label: "How to apply" },
  { id: "company", label: "Contact & company" },
] as const;

export function ApplyTabs({
  letter,
  letterId,
  wants,
  steps,
  url,
  asks,
  contact,
  companyNote,
  sources,
}: {
  letter: FormalLetter;
  letterId: string | null;
  wants: SpecPoint[];
  steps: string[];
  url: string;
  asks: string[];
  contact: ApplyContact | null;
  companyNote: string;
  sources: CompanySource[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("letter");
  return (
    <div>
      <div className="mt-10 flex flex-wrap gap-x-5 gap-y-1 border-b border-[#F2F1EC] font-mono text-[11px] tracking-[0.12em] uppercase sm:flex-nowrap sm:gap-7 sm:overflow-x-auto">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="-mb-px shrink-0 border-b-2 bg-transparent px-0 pt-0 pb-3.5 whitespace-nowrap hover:text-[#F2F1EC]"
              style={{
                color: active ? "#F2F1EC" : "rgba(242,241,236,.45)",
                borderColor: active ? "#F2F1EC" : "transparent",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {tab === "letter" ? <LetterSheet letter={letter} letterId={letterId} /> : null}
      {tab === "want" ? (
        <div className="mt-9 flex flex-col border-t border-[rgba(242,241,236,0.12)]">
          {wants.length ? (
            wants.map((point, index) => (
              <div key={point.want} className="grid grid-cols-[48px_minmax(0,1fr)] gap-5 border-b border-[rgba(242,241,236,0.12)] py-[26px]">
                <div className="pt-1.5 font-mono text-xs text-[rgba(242,241,236,0.45)]">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div className="font-[family-name:var(--font-bricolage)] text-[22px] leading-[1.15] font-bold tracking-[-0.01em] break-words sm:text-[27px]">{point.want}</div>
                  <p className="mt-2.5 max-w-[60ch] text-[17.5px] leading-[1.5] text-[rgba(242,241,236,0.7)]">{point.show}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-[17.5px] text-[rgba(242,241,236,0.7)]">The spec read is still being drawn up.</p>
          )}
        </div>
      ) : null}
      {tab === "how" ? (
        <div className="mt-9 grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ol className="m-0 flex list-none flex-col gap-[18px] p-0">
            {steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 text-[17.5px] leading-[1.5]">
                <span className="pt-1.5 font-mono text-xs text-[#FF6B5B]">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
            {url ? (
              <li className="mt-2">
                <a href={url} className="border-b border-[rgba(242,241,236,0.3)] pb-0.5 font-mono text-[11px] tracking-[0.1em] text-[#F2F1EC] uppercase no-underline">
                  Open the listing ↗
                </a>
              </li>
            ) : null}
          </ol>
          <div>
            <div className="eyebrow mb-3.5 text-[10.5px]">They ask for</div>
            {asks.length ? (
              <ul className="m-0 flex list-none flex-col p-0">
                {asks.map((ask) => (
                  <li key={ask} className="border-b border-[rgba(242,241,236,0.1)] py-2 text-[15.5px] leading-[1.45]">
                    {ask}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15.5px] text-[rgba(242,241,236,0.7)]">Nothing extra is listed beyond the role itself.</p>
            )}
          </div>
        </div>
      ) : null}
      {tab === "company" ? (
        <div className="mt-9 max-w-[62ch]">
          <div className="eyebrow mb-3 text-[10.5px]">Contact</div>
          <ContactBlock contact={contact} />
          <div className="eyebrow mt-9 mb-3 text-[10.5px]">The company</div>
          <div className="flex flex-col gap-4 text-[18.5px] leading-[1.55] text-[rgba(242,241,236,0.85)]">
            {(companyNote || "A short note on the company is still being drawn up.").split(/\n\n+/).filter(Boolean).map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="m-0">
                {paragraph}
              </p>
            ))}
          </div>
          {sources.length ? (
            <div className="mt-6 flex flex-col gap-2">
              {sources.map((source) => (
                <a key={source.url} href={source.url} className="font-mono text-[11.5px] break-all text-[rgba(242,241,236,0.55)] no-underline hover:text-[#FF6B5B]">
                  {source.label || source.url}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ContactBlock({ contact }: { contact: ApplyContact | null }) {
  if (!contact || (!contact.name && !contact.email && !contact.link)) {
    return <p className="m-0 mb-9 text-[17.5px] text-[rgba(242,241,236,0.7)]">{contact?.none || "No named contact, email, or hiring link is public."}</p>;
  }
  return (
    <div className="mb-9 space-y-2 text-[17.5px] text-[rgba(242,241,236,0.7)]">
      {contact.name ? <p className="m-0">{contact.name}</p> : null}
      {contact.email ? (
        <p className="m-0">
          <a className="underline decoration-[rgba(242,241,236,0.3)] underline-offset-4" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </p>
      ) : null}
      {contact.link ? (
        <p className="m-0">
          <a className="underline decoration-[rgba(242,241,236,0.3)] underline-offset-4" href={contact.link}>
            {contact.linkLabel || contact.link}
          </a>
        </p>
      ) : null}
    </div>
  );
}
