"use client";

import { useTransition } from "react";
import { runLinkedInSearch } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SearchTrigger() {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      aria-busy={pending}
      className="h-auto rounded-full px-5 py-2 font-serif text-base"
      onClick={() => {
        start(async () => {
          const result = await runLinkedInSearch();
          if (!result.ok) toast.error(result.message);
        });
      }}
    >
      {pending ? "Searching…" : "Run LinkedIn search"}
    </Button>
  );
}
