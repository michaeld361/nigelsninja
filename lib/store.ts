import fs from "fs";
import path from "path";
import { defaultSettings } from "./defaults";
import type { Store } from "./types";

export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "store.json");
}

function seedPath(): string {
  return path.join(dataDir(), "seed.json");
}

export function emptyStore(): Store {
  return {
    allowedUsers: [],
    profile: {
      cvText: "",
      cvVersion: 0,
      cvHistory: [],
      linkedinSummary: "",
      personalStatement: "",
      phone: "07795633377",
      email: "nigel@nigeldown.com",
      addressLines: ["17 Leith Road", "London N22 5QA"],
      linkedinUrl: "www.linkedin.com/in/nigeldown",
      headline: "Data Privacy Professional",
      updatedAt: new Date().toISOString(),
    },
    profileFiles: [],
    settings: defaultSettings(),
    runs: [],
    rawJobs: [],
    jobs: [],
    fitAssessments: [],
    letters: [],
    applications: [],
    applyPacks: [],
    statusEvents: [],
    sessions: [],
    magicLinks: [],
    runLock: null,
  };
}

function ensureStoreFile() {
  fs.mkdirSync(dataDir(), { recursive: true });
  if (fs.existsSync(storePath())) return;
  if (fs.existsSync(seedPath())) {
    fs.copyFileSync(seedPath(), storePath());
    return;
  }
  fs.writeFileSync(storePath(), JSON.stringify(emptyStore()));
}

function normalise(store: Store): Store {
  if (!store.applyPacks) store.applyPacks = [];
  for (const pack of store.applyPacks) if (!pack.companySources) pack.companySources = [];
  return store;
}

export function loadStore(): Store {
  ensureStoreFile();
  return normalise(JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store);
}

export function saveStore(store: Store) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const target = storePath();
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(store));
  fs.renameSync(temporary, target);
}

function withLock<T>(fn: () => T): T {
  fs.mkdirSync(dataDir(), { recursive: true });
  const lockPath = path.join(dataDir(), "store.lock");
  const started = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      try {
        return fn();
      } finally {
        fs.closeSync(fd);
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* already gone */
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      if (Date.now() - started > 20000) throw new Error("Timed out waiting for the data store");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

export function updateStore<T>(fn: (store: Store) => T): T {
  return withLock(() => {
    ensureStoreFile();
    const store = normalise(JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store);
    const result = fn(store);
    const temporary = `${storePath()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(store));
    fs.renameSync(temporary, storePath());
    return result;
  });
}

export function writeSeed(store: Store) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const clone = structuredClone(store);
  clone.sessions = [];
  clone.magicLinks = [];
  clone.runLock = null;
  fs.writeFileSync(seedPath(), JSON.stringify(clone));
}
