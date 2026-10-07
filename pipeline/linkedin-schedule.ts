import fs from "fs";
import path from "path";
import { runPipeline } from "./run";

const INTERVAL_MS = 2 * 60 * 60 * 1000;
const statePath = path.join(process.cwd(), "data", "linkedin-schedule.json");

type ScheduleState = {
  installedAt: string;
  nextRunAt: string;
  lastRunAt: string | null;
};

function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key) || process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readState(): ScheduleState {
  if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, "utf8")) as ScheduleState;
  const now = new Date();
  const state: ScheduleState = {
    installedAt: now.toISOString(),
    nextRunAt: new Date(now.getTime() + INTERVAL_MS).toISOString(),
    lastRunAt: null,
  };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

function writeState(state: ScheduleState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function advance(from: string): string {
  let cursor = new Date(from).getTime();
  const now = Date.now();
  if (Number.isNaN(cursor)) cursor = now;
  while (cursor <= now) cursor += INTERVAL_MS;
  return new Date(cursor).toISOString();
}

async function main() {
  loadEnv();
  const state = readState();
  if (Date.now() < new Date(state.nextRunAt).getTime()) {
    console.log(JSON.stringify({ skipped: "waiting", nextRunAt: state.nextRunAt }));
    return;
  }
  const result = await runPipeline({ trigger: "cron", by: "schedule", sources: ["linkedin"] });
  if (!result.ok && result.message === "A run is already in progress.") {
    console.log(JSON.stringify({ skipped: "locked", nextRunAt: state.nextRunAt }));
    return;
  }
  state.lastRunAt = new Date().toISOString();
  state.nextRunAt = advance(state.nextRunAt);
  writeState(state);
  console.log(JSON.stringify({ ok: result.ok, nextRunAt: state.nextRunAt }));
}

main().catch(() => {
  console.log(JSON.stringify({ ok: false }));
  process.exit(1);
});
