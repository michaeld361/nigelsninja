"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { linkedInSearchStatus, runLinkedInSearch } from "@/app/actions";

export function JobsRun({
  title,
  searching: initialSearching,
  clock,
  fetched,
  worth,
  error: initialError,
}: {
  title: ReactNode;
  searching: boolean;
  clock: string;
  fetched: number;
  worth: number;
  error: string | null;
}) {
  const router = useRouter();
  const [searching, setSearching] = useState(initialSearching);
  const [error, setError] = useState(initialError);
  const clickedAt = useRef(0);
  const sawLock = useRef(initialSearching);
  const [, start] = useTransition();

  useEffect(() => {
    if (initialSearching) {
      sawLock.current = true;
      setSearching(true);
      setError(null);
      return;
    }
    if (clickedAt.current && Date.now() - clickedAt.current < 8000) return;
    setSearching(false);
    setError(initialError);
  }, [initialSearching, initialError, clock, fetched, worth]);

  useEffect(() => {
    if (!searching) return;
    let live = true;
    const tick = async () => {
      const status = await linkedInSearchStatus();
      if (!live) return;
      if (status.searching) {
        sawLock.current = true;
        return;
      }
      if (!sawLock.current && Date.now() - clickedAt.current < 8000) return;
      setSearching(false);
      setError(status.error);
      router.refresh();
    };
    const id = setInterval(tick, 4000);
    void tick();
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [searching, router]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#F2F1EC] pb-7">
        {title}
        <button
          type="button"
          disabled={searching}
          aria-busy={searching}
          aria-pressed={searching}
          className={`pill max-w-full whitespace-normal sm:whitespace-nowrap${searching ? " is-searching" : ""}`}
          onClick={() => {
            clickedAt.current = Date.now();
            sawLock.current = false;
            setSearching(true);
            setError(null);
            start(async () => {
              try {
                const result = await runLinkedInSearch();
                if (!result.ok && !/already in progress/i.test(result.message)) {
                  setError(result.message);
                  setSearching(false);
                  return;
                }
              } catch {
                /* The lock on the server keeps the button pressed until the run finishes. */
              }
            });
          }}
        >
          {searching ? "Searching…" : "Run LinkedIn search"}
          <span className="font-mono text-[13px]">↻</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 pt-[22px] font-mono text-[11px] tracking-[0.04em] text-[rgba(242,241,236,0.55)] sm:grid-cols-3 sm:justify-start sm:gap-10">
        <div>
          <span className="text-sm text-[#F2F1EC]">{searching ? "Still searching" : clock}</span>
          <br />
          {searching ? "this search" : "last search"}
        </div>
        <div>
          <span className="text-sm text-[#F2F1EC]">{fetched}</span>
          <br />
          listings searched
        </div>
        <div>
          <span className="text-sm text-[#FF6B5B]">{worth}</span>
          <br />
          worth a look
        </div>
      </div>
      {error && !searching ? <p className="mt-6 max-w-[52ch] text-[15px] leading-6 text-[#B3261E]">{error}</p> : null}
    </>
  );
}
