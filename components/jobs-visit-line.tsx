"use client";

import { useEffect, useState } from "react";
import { pickJobsVisitLine } from "@/lib/jobs-visit-lines";

export function JobsVisitLine() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    setLine(pickJobsVisitLine());
  }, []);

  return (
    <p className="mt-10 max-w-[40ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.72)]" style={{ minHeight: "1.45em" }}>
      {line}
    </p>
  );
}
