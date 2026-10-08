import fs from "fs";
import path from "path";
import { dataDir } from "@/lib/store";
import { initialLondonSlot, nextLondonFive, slotIsDue } from "./morning-schedule";

type SlotState = {
  nextRunAt: string;
  lastArmedAt: string | null;
};

function slotPath(): string {
  return path.join(dataDir(), "linkedin-slot.json");
}

function read(now = new Date()): SlotState {
  const file = slotPath();
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")) as SlotState;
  return { nextRunAt: initialLondonSlot(5, now), lastArmedAt: null };
}

function write(state: SlotState) {
  const file = slotPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function linkedinSlot(now = new Date()): { due: boolean; nextRunAt: string } {
  const state = read(now);
  if (!fs.existsSync(slotPath())) write(state);
  return { due: slotIsDue(state.nextRunAt, now), nextRunAt: state.nextRunAt };
}

/** Claim today's 5:00 London slot so the other UTC hour does not start a second search. */
export function armLinkedInSlot(now = new Date()): string {
  const nextRunAt = nextLondonFive(new Date(now.getTime() + 60 * 1000)).toISOString();
  write({ nextRunAt, lastArmedAt: now.toISOString() });
  return nextRunAt;
}
