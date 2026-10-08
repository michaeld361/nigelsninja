"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { bulkSkip, setJobStatus } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIPELINE_TABS, STATUS_LABEL } from "@/lib/format";
import type { JobStatus } from "@/lib/types";
import type { TodayCard } from "@/lib/cards";
import { toast } from "sonner";

export function PipelineBoard({ cards }: { cards: TodayCard[] }) {
  const [tab, setTab] = useState<JobStatus>("new");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [contract, setContract] = useState("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    return cards.filter((card) => {
      if (card.status !== tab) return false;
      if (query && !`${card.title} ${card.company}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (source !== "all" && !card.sources.some((item) => item.label.toLowerCase().includes(source))) return false;
      if (contract !== "all" && card.contract.toLowerCase() !== contract) return false;
      return true;
    });
  }, [cards, tab, query, source, contract]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every role, including the 25 you had already applied for before this assistant existed.</p>
        </div>
        <a className="text-sm underline" href="/api/export/applied">
          Export applied as CSV
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PIPELINE_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${tab === item ? "bg-primary text-primary-foreground" : ""}`}
          >
            {STATUS_LABEL[item]} {cards.filter((card) => card.status === item).length}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company or title" />
        <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="all">All sources</option>
          <option value="linkedin">LinkedIn</option>
          <option value="reed">Reed.co.uk</option>
          <option value="indeed">Indeed</option>
          <option value="tracker">Tracker</option>
        </select>
        <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={contract} onChange={(event) => setContract(event.target.value)}>
          <option value="all">All contracts</option>
          <option value="permanent">Permanent</option>
          <option value="contract">Contract</option>
          <option value="fixed term">Fixed term</option>
          <option value="part time">Part time</option>
          <option value="freelance">Freelance</option>
        </select>
      </div>
      {picked.length ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await bulkSkip(picked);
              if (!result.ok) toast.error(result.message);
              else {
                toast.success(result.message ?? "Skipped");
                setPicked([]);
              }
            })
          }
        >
          Skip {picked.length} selected
        </Button>
      ) : null}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">Nothing in {STATUS_LABEL[tab]} matches these filters.</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {visible.map((card) => (
            <li key={card.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.includes(card.id)}
                  onChange={(event) =>
                    setPicked((current) => (event.target.checked ? [...current, card.id] : current.filter((id) => id !== card.id)))
                  }
                />
                <span className="min-w-0">
                  <Link href={`/jobs/${card.id}`} className="font-medium underline-offset-2 hover:underline">
                    {card.title}
                  </Link>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {[card.company, card.location, card.salary].filter(Boolean).join(" · ")}
                    {card.score != null ? ` · ${card.score}` : ""}
                  </span>
                  {card.filteredReason ? <span className="mt-1 block text-xs text-muted-foreground">{card.filteredReason}</span> : null}
                </span>
              </label>
              <span className="flex flex-wrap items-center gap-2">
                {card.demo ? <Badge variant="outline">Sample</Badge> : null}
                {card.blockers.length ? <Badge variant="destructive">Blocker</Badge> : null}
                <select
                  className="h-8 rounded-lg border bg-background px-2 text-xs"
                  value={card.status}
                  onChange={(event) => {
                    start(async () => {
                      const result = await setJobStatus(card.id, event.target.value as JobStatus);
                      if (!result.ok) toast.error(result.message);
                    });
                  }}
                >
                  {PIPELINE_TABS.map((item) => (
                    <option key={item} value={item}>
                      {STATUS_LABEL[item]}
                    </option>
                  ))}
                  <option value="expired">Expired</option>
                </select>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
