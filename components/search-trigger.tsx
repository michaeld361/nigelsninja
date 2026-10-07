"use client";

import { useTransition } from "react";
import { runLinkedInSearch } from "@/app/actions";
import { toast } from "sonner";

export function SearchTrigger() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      className="pill"
      onClick={() => {
        start(async () => {
          const result = await runLinkedInSearch();
          if (!result.ok) toast.error(result.message);
        });
      }}
    >
      {pending ? "Searching…" : "Run LinkedIn search"}
      <span className="font-mono text-[13px]">↻</span>
    </button>
  );
}
