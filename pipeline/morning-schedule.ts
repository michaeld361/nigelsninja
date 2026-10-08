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

export function slotIsDue(nextRunAt: string, now = new Date()): boolean {
  const due = new Date(nextRunAt).getTime();
  if (Number.isNaN(due)) return true;
  return now.getTime() >= due;
}

export function armNextMorning(from = new Date()): string {
  return nextLondonSix(new Date(from.getTime() + 60 * 1000)).toISOString();
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
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function redact(value: string): string {
  let text = value;
  for (const [key, secret] of Object.entries(process.env)) {
    if (!secret || secret.length < 8) continue;
    if (!/TOKEN|KEY|SECRET|PASSWORD/i.test(key)) continue;
    text = text.split(secret).join("");
  }
  return text.slice(0, 300);
}

function log(value: unknown) {
  const line = `${JSON.stringify(value)}\n`;
  try {
    fs.writeSync(1, line);
  } catch {
    console.log(line.trim());
  }
}

export async function runMorningSlot(now = new Date()): Promise<{ sent: boolean; skipped?: string; error?: string; subject?: string; nextRunAt: string }> {
  const state = readState();
  if (!slotIsDue(state.nextRunAt, now)) {
    log({ skipped: "waiting", nextRunAt: state.nextRunAt });
    return { sent: false, skipped: "waiting", nextRunAt: state.nextRunAt };
  }
  const result = await sendMorningEmail(now);
  if (!result.sent) {
    state.attempts += 1;
    state.lastError = redact(result.error || "not sent");
    state.nextRunAt = state.attempts >= 3 ? armNextMorning(now) : new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    if (state.attempts >= 3) state.attempts = 0;
    writeState(state);
    log({ sent: false, error: state.lastError, nextRunAt: state.nextRunAt });
    return { sent: false, error: state.lastError || undefined, subject: result.subject, nextRunAt: state.nextRunAt };
  }
  state.lastRunAt = now.toISOString();
  state.lastError = null;
  state.attempts = 0;
  state.nextRunAt = armNextMorning(now);
  writeState(state);
  log({ sent: true, subject: result.subject, nextRunAt: state.nextRunAt });
  return { sent: true, subject: result.subject, nextRunAt: state.nextRunAt };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnv();
  const watch = process.argv.includes("--watch");
  for (;;) {
    const result = await runMorningSlot();
    if (!watch) {
      if (!result.sent && !result.skipped) process.exitCode = 1;
      return;
    }
    const wait = Math.max(0, new Date(result.nextRunAt).getTime() - Date.now());
    await sleep(Math.min(wait || 1000, 15 * 60 * 1000));
  }
}

const isMain = process.argv[1] && /morning-schedule\.ts$/.test(process.argv[1]);
if (isMain) {
  main().catch(() => {
    log({ sent: false });
    process.exit(1);
  });
}
