import { after } from "next/server";
import { cronAuthorized, redactSecrets } from "@/lib/cron-auth";
import { loadStore } from "@/lib/store";
import { armLinkedInSlot, linkedinSlot } from "@/pipeline/linkedin-slot";
import { runPipeline } from "@/pipeline/run";
import type { Store } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Memory = {
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  message?: string;
  fetched?: number;
  fresh?: number;
};

const memory = globalThis as typeof globalThis & { __linkedinCron?: Memory };

function lockHeld(store: Store): boolean {
  return Boolean(store.runLock && new Date(store.runLock.until).getTime() > Date.now());
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  const store = loadStore();
  const remembered = memory.__linkedinCron;
  const latest = store.runs.find((item) => item.finishedAt && !item.counts.linkedin?.demo) ?? null;
  const state = lockHeld(store) ? "running" : remembered?.finishedAt ? (remembered.ok ? "done" : "failed") : "idle";
  const finishedAt = state === "running" ? null : remembered?.finishedAt || latest?.finishedAt || null;
  return Response.json({
    ok: state !== "failed",
    state,
    finishedAt,
    fetched: remembered?.fetched ?? latest?.counts.linkedin?.fetched ?? 0,
    fresh: remembered?.fresh ?? latest?.totals.new ?? 0,
    error: state === "failed" ? remembered?.message || null : null,
  });
}

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  const slot = linkedinSlot();
  if (!slot.due) return Response.json({ ok: true, skipped: "waiting", nextRunAt: slot.nextRunAt });
  if (lockHeld(loadStore())) return Response.json({ ok: true, state: "running", nextRunAt: slot.nextRunAt }, { status: 202 });
  const nextRunAt = armLinkedInSlot();

  const startedAt = new Date().toISOString();
  memory.__linkedinCron = { startedAt, ok: false };
  after(async () => {
    try {
      const result = await runPipeline({ trigger: "cron", by: "render", sources: ["linkedin"], steadyBudget: true });
      if (result.ok) {
        memory.__linkedinCron = {
          startedAt,
          finishedAt: result.run.finishedAt || new Date().toISOString(),
          ok: true,
          fetched: result.run.totals.fetched,
          fresh: result.run.totals.new,
        };
        console.log(JSON.stringify({ event: "linkedin-run", ok: true, finishedAt: result.run.finishedAt, fetched: result.run.totals.fetched }));
        return;
      }
      memory.__linkedinCron = {
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: false,
        message: redactSecrets(result.message || "The LinkedIn search did not finish."),
      };
      console.log(JSON.stringify({ event: "linkedin-run", ok: false }));
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : "The LinkedIn search did not finish.");
      memory.__linkedinCron = { startedAt, finishedAt: new Date().toISOString(), ok: false, message };
      console.log(JSON.stringify({ event: "linkedin-run", ok: false }));
    }
  });
  return Response.json({ ok: true, state: "started", startedAt, nextRunAt }, { status: 202 });
}
