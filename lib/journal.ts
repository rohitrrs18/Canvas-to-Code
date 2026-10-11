import type { JournalEntry, Op } from "./types";

const MAX_ENTRIES = 5_000;

class Journal {
  private entries: JournalEntry[] = [];
  private index = new Map<string, number>();
  private listeners = new Set<(e: JournalEntry) => void>();

  append(op: Op, durability: 0 | 1 | 2 = 0): void {
    const entry: JournalEntry = { op, durability };
    this.entries.push(entry);
    this.index.set(op.id, this.entries.length - 1);
    if (this.entries.length > MAX_ENTRIES) {
      // Drop oldest, but never drop unsynced
      const drop = this.entries.findIndex((e) => e.durability === 2);
      if (drop >= 0) this.entries.splice(drop, 1);
    }
    this.listeners.forEach((l) => l(entry));
  }

  markDurable(opId: string, level: 1 | 2): void {
    const i = this.index.get(opId);
    if (i == null) return;
    const e = this.entries[i];
    if (level > e.durability) e.durability = level;
  }

  all(): Op[] { return this.entries.map((e) => e.op); }
  pending(): Op[] { return this.entries.filter((e) => e.durability < 2).map((e) => e.op); }
  reset(ops: Op[]): void {
    this.entries = ops.map((op) => ({ op, durability: 1 as const }));
    this.index.clear();
    this.entries.forEach((e, i) => this.index.set(e.op.id, i));
  }

  onAppend(fn: (e: JournalEntry) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const journal = new Journal();