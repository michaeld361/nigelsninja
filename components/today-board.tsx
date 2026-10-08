"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setJobStatus } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TodayCard } from "@/lib/cards";
import type { JobStatus } from "@/lib/types";
import { toast } from "sonner";

export function TodayBoard({
  summary,
  sample,
  fresh,
  lowFit,
}: {
  summary: string;
  sample: boolean;
  fresh: TodayCard[];
  lowFit: TodayCard[];
}) {
  const cards = [...fresh, ...lowFit];
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "j" || event.key === "J") setIndex((value) => Math.min(cards.length - 1, value + 1));
      if (event.key === "k" || event.key === "K") setIndex((value) => Math.max(0, value - 1));
      const current = cards[index];
      if (!current) return;
      if (event.key === "s" || event.key === "S") act(current.id, "shortlisted");
      if (event.key === "x" || event.key === "X") act(current.id, "skipped");
      if (event.key === "a" || event.key === "A") act(current.id, "applied");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function act(id: string, status: JobStatus) {
    start(async () => {
      const result = await setJobStatus(id, status);
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(status === "applied" ? "Marked applied" : status === "shortlisted" ? "Shortlisted" : "Skipped");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Today</h1>
        <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">On a keyboard, J and K move, S shortlists, X skips, A marks applied. On a phone, swipe right to shortlist and left to skip.</p>
      </div>
      {sample ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          This run used sample listings because the Apify, Reed and JSearch keys are not set. Scores and letters follow your documents. Sample cards are marked so they are not mistaken for live vacancies.
        </p>
      ) : null}
      {fresh.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
          {summary} Nothing new is waiting above the fit line. Low fit and filtered roles are kept off this list until you open them.
        </div>
      ) : (
        <ul className="space-y-3">
          {fresh.map((card, cardIndex) => (
            <li key={card.id}>
              <JobCard card={card} active={index === cardIndex} pending={pending} onAct={act} />
            </li>
          ))}
        </ul>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Low fit</h2>
        {lowFit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No low fit roles from the latest run.</p>
        ) : (
          <ul className="space-y-3">
            {lowFit.map((card) => (
              <li key={card.id}>
                <JobCard card={card} active={false} pending={pending} onAct={act} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function JobCard({
  card,
  active,
  pending,
  onAct,
}: {
  card: TodayCard;
  active: boolean;
  pending: boolean;
  onAct: (id: string, status: JobStatus) => void;
}) {
  const [drag, setDrag] = useState(0);
  return (
    <article
      id={`job-${card.id}`}
      className={`rounded-2xl border bg-card p-4 shadow-sm ${active ? "ring-2 ring-ring" : ""}`}
      style={{ transform: `translateX(${drag}px)` }}
      onTouchStart={(event) => {
        const start = event.changedTouches[0]?.clientX ?? 0;
        (event.currentTarget as HTMLElement).dataset.x = String(start);
      }}
      onTouchEnd={(event) => {
        const start = Number((event.currentTarget as HTMLElement).dataset.x || 0);
        const end = event.changedTouches[0]?.clientX ?? start;
        const delta = end - start;
        setDrag(0);
        if (delta > 70) onAct(card.id, "shortlisted");
        if (delta < -70) onAct(card.id, "skipped");
      }}
    >
      <div className="flex items-start gap-3">
        <Score score={card.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium">{card.title}</h2>
            {card.demo ? <Badge variant="outline">Sample</Badge> : null}
            <Badge variant="secondary">{card.letter === "none" ? "No letter" : card.letter === "draft" ? "Draft" : "Reviewed"}</Badge>
            {card.checkThis ? <Badge variant="destructive">Check this</Badge> : null}
          </div>
          <p className="text-sm">{card.company}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[card.location, card.pattern, card.contract, card.salary].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {card.sources.map((source, sourceIndex) => (
              <span key={source.url}>
                {sourceIndex > 0 ? " · " : ""}
                <a className="underline" href={source.url} target="_blank" rel="noreferrer">
                  {source.label === "Reed.co.uk" ? "via Reed.co.uk" : source.label}
                </a>
              </span>
            ))}
            {" · "}
            {card.posted}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6">{card.summary}</p>
      {card.blockers.length ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{card.blockers[0]}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onAct(card.id, "shortlisted")}>
          Shortlist
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onAct(card.id, "skipped")}>
          Skip
        </Button>
        <Button size="sm" disabled={pending} onClick={() => onAct(card.id, "applied")}>
          Applied
        </Button>
        <Button size="sm" variant="secondary" render={<Link href={`/jobs/${card.id}`} />}>
          {card.letter === "none" ? "Request letter" : "Open letter"}
        </Button>
      </div>
    </article>
  );
}

function Score({ score }: { score: number | null }) {
  const tone = score == null ? "text-muted-foreground" : score >= 75 ? "text-primary" : score >= 60 ? "text-foreground" : "text-muted-foreground";
  return (
    <div className={`grid size-12 shrink-0 place-items-center rounded-full border text-sm font-medium ${tone}`}>
      {score ?? "-"}
    </div>
  );
}
