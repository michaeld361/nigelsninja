"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FormalLetter } from "@/lib/letter-plain";

export function LetterSheet({ letter, letterId }: { letter: FormalLetter; letterId: string | null }) {
  const [copied, setCopied] = useState(false);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="font-serif text-3xl tracking-tight">Letter</h2>
        <button
          type="button"
          className="font-serif text-xl text-primary underline decoration-primary/30 underline-offset-8"
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
      </div>
      <article className="mt-6 bg-white px-8 py-10 text-[#2c261f] shadow-[0_1px_2px_rgba(42,36,28,0.04)] ring-1 ring-black/5 sm:px-12 sm:py-14">
        <div className="text-sm leading-6">
          {letter.sender.map((line, index) => (
            <p key={`${index}-${line}`} className={index === 0 ? "text-base" : undefined}>
              {line}
            </p>
          ))}
        </div>
        <p className="mt-10">{letter.date}</p>
        {letter.recipient.length ? (
          <div className="mt-10 leading-7">
            {letter.recipient.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        <p className="mt-10">
          <span className="block text-xs tracking-wide text-[#6f675d]">Suggested subject</span>
          <span className="mt-1 block">{letter.subject}</span>
        </p>
        <p className="mt-10">{letter.salutation}</p>
        <div className="mt-6 space-y-5 leading-7">
          {letter.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-10">{letter.signOff}</p>
        <p className="mt-8">{letter.signature}</p>
        {letter.disclaimer ? <p className="mt-12 text-sm leading-6 text-[#6f675d]">{letter.disclaimer}</p> : null}
      </article>
      {letterId ? (
        <p className="mt-4 text-sm">
          <a className="underline decoration-foreground/30 underline-offset-4" href={`/api/letters/${letterId}/docx`}>
            Download .docx
          </a>
        </p>
      ) : null}
    </section>
  );
}
