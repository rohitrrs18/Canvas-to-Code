import type { Op, PersistedState } from "./types";
import { CURRENT_VERSION } from "./oplog";
import { journal } from "./journal";

const DB_NAME = "canvas-to-code";
const STORE_OPS = "ops";
const STORE_META = "meta";
const KEY_META = "session-meta";
const KEY_ROOT = "canvas-root-id";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (!("indexedDB" in window)) return resolve(null);
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OPS)) {
        db.createObjectStore(STORE_OPS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

/**
 * Persists an op. Called from a scheduler — NEVER awaits in the UI path.
 * Marks the journal entry durable once the transaction commits.
 */
export async function persistOp(op: Op): Promise<void> {
  const db = await openDB();
  if (!db) {
    try {
      const raw = localStorage.getItem(DB_NAME) ?? "";
      localStorage.setItem(DB_NAME, raw + JSON.stringify(op) + "\n");
      journal.markDurable(op.id, 1);
    } catch { /* quota exceeded — journal still holds it */ }
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_OPS, "readwrite");
    tx.objectStore(STORE_OPS).put(op);
    tx.oncomplete = () => {
      journal.markDurable(op.id, 1);
      resolve();
    };
    tx.onerror = () => resolve();
  });
}

export async function persistBatch(ops: Op[]): Promise<void> {
  if (ops.length === 0) return;
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_OPS, "readwrite");
    const store = tx.objectStore(STORE_OPS);
    for (const op of ops) store.put(op);
    tx.oncomplete = () => {
      ops.forEach((o) => journal.markDurable(o.id, 1));
      resolve();
    };
    tx.onerror = () => resolve();
  });
}

export async function loadPersistedOps(): Promise<Op[]> {
  const db = await openDB();
  if (!db) {
    const raw = localStorage.getItem(DB_NAME) ?? "";
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean) as Op[];
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_OPS, "readonly");
    const req = tx.objectStore(STORE_OPS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => resolve([]);
  });
}

export async function loadMeta(): Promise<PersistedState | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(KEY_META);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function saveMeta(meta: PersistedState): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put(meta, KEY_META);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/* ------------------------------------------------------------------ *
 *  Root ID persistence — the fix for "ops replay to an empty tree".  *
 * ------------------------------------------------------------------ */

export async function loadRootId(): Promise<string | null> {
  // Fast path: localStorage mirrors the ID for synchronous reads.
  const fromLocal = localStorage.getItem(KEY_ROOT);
  if (fromLocal) return fromLocal;

  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(KEY_ROOT);
    req.onsuccess = () => {
      const val = req.result ?? null;
      if (val) localStorage.setItem(KEY_ROOT, val);
      resolve(val);
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveRootId(rootId: string): Promise<void> {
  try { localStorage.setItem(KEY_ROOT, rootId); } catch { /* ignore */ }
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put(rootId, KEY_ROOT);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearRootId(): Promise<void> {
  try { localStorage.removeItem(KEY_ROOT); } catch { /* ignore */ }
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).delete(KEY_ROOT);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/* ------------------------------------------------------------------ */

export async function compactLog(keepLastN = 500): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const all = await loadPersistedOps();
  if (all.length <= keepLastN) return;
  const trimmed = all.slice(-keepLastN);
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_OPS, "readwrite");
    const store = tx.objectStore(STORE_OPS);
    store.clear().onsuccess = () => {
      for (const op of trimmed) store.put(op);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  if (!db) {
    localStorage.removeItem(DB_NAME);
    localStorage.removeItem(KEY_ROOT);
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction([STORE_OPS, STORE_META], "readwrite");
    tx.objectStore(STORE_OPS).clear();
    tx.objectStore(STORE_META).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Write-behind scheduler. Coalesces rapid ops (e.g. drag updates) into
 * a single transaction without ever blocking the caller.
 */
class FlushScheduler {
  private queue: Op[] = [];
  private scheduled = false;

  enqueue(op: Op): void {
    this.queue.push(op);
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => this.flush());
      } else {
        setTimeout(() => this.flush(), 0);
      }
    });
  }

  private async flush(): Promise<void> {
    this.scheduled = false;
    const batch = this.queue;
    this.queue = [];
    try {
      if (batch.length === 1) await persistOp(batch[0]);
      else await persistBatch(batch);
    } catch { /* journal retains for retry */ }
    if (this.queue.length > 0) this.enqueue(this.queue.pop()!);
  }
}

export const flushScheduler = new FlushScheduler();