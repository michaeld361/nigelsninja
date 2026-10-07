import fs from "fs";
import path from "path";
import { sendMorningEmail } from "./morning-email";

const statePath = path.join(process.cwd(), "data", "morning-email.json");

type ScheduleState = {
  installedAt: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastError: string | null;
  attempts: number;
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

export function nextLondonSix(from = new Date()): Date {
  const today = londonDate(from);
  let target = utcForLondonClock(today.year, today.month, today.day, 6, 0);
  if (target.getTime() <= from.getTime()) {
    const tomorrow = londonDate(new Date(target.getTime() + 26 * 60 * 60 * 1000));
    target = utcForLondonClock(tomorrow.year, tomorrow.month, tomorrow.day, 6, 0);
  }
  return target;
}

function londonDate(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function utcForLondonClock(year: number, month: number, day: number, hour: number, minute: number): Date {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const got = londonDate(utc);
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
    const delta = desired - actual;
    if (delta === 0) break;
    utc = new Date(utc.getTime() + delta);
  }
  return utc;
}

function readState(): ScheduleState {
  if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, "utf8")) as ScheduleState;
  const now = new Date();
  const state: ScheduleState = {
    installedAt: now.toISOString(),
    nextRunAt: nextLondonSix(now).toISOString(),
    lastRunAt: null,
    lastError: null,
    attempts: 0,
  };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

function writeState(state: ScheduleState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function main() {
  loadEnv();
  const state = readState();
  if (Date.now() < new Date(state.nextRunAt).getTime()) {
    console.log(JSON.stringify({ skipped: "waiting", nextRunAt: state.nextRunAt }));
    return;
  }
  const result = await sendMorningEmail();
  if (!result.sent) {
    state.attempts += 1;
    state.lastError = (result.error || "not sent").slice(0, 300);
    state.nextRunAt = state.attempts >= 3 ? nextLondonSix(new Date(Date.now() + 60 * 1000)).toISOString() : new Date(Date.now() + 30 * 60 * 1000).toISOString();
    if (state.attempts >= 3) state.attempts = 0;
    writeState(state);
    console.log(JSON.stringify({ sent: false, error: state.lastError, nextRunAt: state.nextRunAt }));
    return;
  }
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;
  state.attempts = 0;
  state.nextRunAt = nextLondonSix(new Date(Date.now() + 60 * 1000)).toISOString();
  writeState(state);
  console.log(JSON.stringify({ sent: true, subject: result.subject, nextRunAt: state.nextRunAt }));
}

const isMain = process.argv[1] && /morning-schedule\.ts$/.test(process.argv[1]);
if (isMain) {
  main().catch(() => {
    console.log(JSON.stringify({ sent: false }));
    process.exit(1);
  });
}
