"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FormalLetter } from "@/lib/letter-plain";

export function LetterSheet({ letter, letterId }: { letter: FormalLetter; letterId: string | null }) {
  const [copied, setCopied] = useState(false);

  return (
    <section>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="text-base text-[rgba(242,241,236,0.6)]">Drafted with AI help; reviewed and edited by Nigel.</div>
        <div className="flex gap-2">
          <button
            type="button"
            className="pill pill-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(letter.plain);
                setCopied(true);
                toast.success("Letter copied");
              } catch {
                toast.error("Could not copy the letter.");
              }
            }}
          >
            {copied ? "Copied" : "Copy letter"}
          </button>
          {letterId ? (
            <a className="pill pill-line pill-sm" href={`/api/letters/${letterId}/docx`}>
              Download .docx
            </a>
          ) : null}
        </div>
      </div>
      <article className="mt-6 box-border max-w-[640px] border border-[rgba(242,241,236,0.1)] bg-[#16181B] px-[clamp(32px,6vw,64px)] py-[clamp(32px,6vw,64px)] text-[16.5px] leading-[1.55] text-[#F2F1EC]">
        <div className="font-mono text-[11.5px] leading-[1.7] text-[rgba(242,241,236,0.65)]">
          {letter.sender.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div className="mt-7 font-mono text-[11.5px] text-[rgba(242,241,236,0.65)]">{letter.date}</div>
        {letter.recipient.length ? (
          <div className="mt-7">
            {letter.recipient.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 font-mono text-[10.5px] tracking-[0.12em] text-[rgba(242,241,236,0.5)] uppercase">Suggested subject</div>
        <div className="mt-1">{letter.subject}</div>
        <div className="mt-7">{letter.salutation}</div>
        <div className="mt-4 flex flex-col gap-4">
          {letter.paragraphs.map((paragraph, index) => (
            <p key={index} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-7">{letter.signOff}</div>
        <div className="mt-5 font-[family-name:var(--font-bricolage)] text-[28px] font-bold">{letter.signature}</div>
        {letter.disclaimer ? <div className="mt-9 text-[12.5px] leading-[1.5] text-[rgba(242,241,236,0.5)]">{letter.disclaimer}</div> : null}
      </article>
    </section>
  );
}
