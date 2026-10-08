"use client";

import { useEffect, useState } from "react";
import { draftJobsLine } from "@/app/jobs-line";
import { jobsFallbackLine, type JobsLineInput } from "@/lib/jobs-line";

export function JobsSummary({ jobs }: { jobs: JobsLineInput[] }) {
  const fallback = jobsFallbackLine(jobs);
  const [line, setLine] = useState(fallback);
  const key = jobs.map((job) => job.id).join("\n");

  useEffect(() => {
    let live = true;
    if (jobs.length === 0) return;
    draftJobsLine({
      count: jobs.length,
      titles: jobs.map((job) => job.title),
      places: jobs.map((job) => job.location),
      fallback,
    })
      .then((next) => {
        if (live && next) setLine(next);
      })
      .catch(() => {
        if (live) setLine(fallback);
      });
    return () => {
      live = false;
    };
  }, [key, fallback, jobs.length]);

  return <p className="mt-10 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">{line}</p>;
}
