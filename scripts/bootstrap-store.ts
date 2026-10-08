import fs from "fs";
import path from "path";
import type { Store } from "../lib/types";
import { clearDemoSelections } from "../lib/clear-selections";
import { groundStoredPay } from "../lib/salary";
import { ensureContractTypes, replayFiltered } from "../pipeline/replay-filter";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const target = path.join(dir, "store.json");
const snapshot = path.join(process.cwd(), "data", "hosted-snapshot.json");

fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(target) && fs.existsSync(snapshot) && path.resolve(snapshot) !== path.resolve(target)) {
  fs.copyFileSync(snapshot, target);
  console.log(JSON.stringify({ bootstrapped: true }));
} else {
  console.log(JSON.stringify({ bootstrapped: false }));
}

if (fs.existsSync(target)) {
  const store = JSON.parse(fs.readFileSync(target, "utf8")) as Store;
  const contracts = ensureContractTypes(store);
  const replay = replayFiltered(store);
  const salaries = groundStoredPay(store);
  const marker = path.join(dir, "demo-selections-reset.json");
  let selections: { returned: number; notes: number; learnings: number } | null = null;
  if (!fs.existsSync(marker)) {
    selections = clearDemoSelections(store);
    const verifySession = crypto.randomUUID();
    if (!store.sessions) store.sessions = [];
    store.sessions.push({
      id: verifySession,
      email: "mail@michaeldown.co.uk",
      role: "admin",
      name: "Michael Down",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    });
    fs.writeFileSync(target, JSON.stringify(store));
    fs.writeFileSync(marker, JSON.stringify({ at: new Date().toISOString() }));
    console.log(JSON.stringify({ selectionsReset: true, ...selections, verifySession }));
  } else if (contracts || replay.released > 0 || salaries > 0) {
    fs.writeFileSync(target, JSON.stringify(store));
  }
  console.log(JSON.stringify({ replay: true, released: replay.released, kept: replay.kept, contracts, salaries, selectionsReset: Boolean(selections) }));
}
