import type { VectorClock, Op } from "./types";

export function tick(vc: VectorClock, clientId: string): VectorClock {
  return { ...vc, [clientId]: (vc[clientId] ?? 0) + 1 };
}

/** True if a causally precedes or equals b. */
export function happensBefore(a: VectorClock, b: VectorClock): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let strictlyLess = false;
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    if (av > bv) return false;
    if (av < bv) strictlyLess = true;
  }
  return strictlyLess;
}

/** True if neither clock dominates the other. */
export function concurrent(a: VectorClock, b: VectorClock): boolean {
  return !happensBefore(a, b) && !happensBefore(b, a) && !eq(a, b);
}

export function eq(a: VectorClock, b: VectorClock): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

export function merge(a: VectorClock, b: VectorClock): VectorClock {
  const out: VectorClock = { ...a };
  for (const k of Object.keys(b)) out[k] = Math.max(out[k] ?? 0, b[k] ?? 0);
  return out;
}

/**
 * Deterministic total order for concurrent ops.
 * Tie-break: earlier timestamp, then clientId, then op id.
 * Ensures every client converges on the same sequence.
 */
export function compareOps(a: Op, b: Op): number {
  if (happensBefore(a.vclock, b.vclock)) return -1;
  if (happensBefore(b.vclock, a.vclock)) return 1;
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  if (a.clientId !== b.clientId) return a.clientId < b.clientId ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/**
 * Sorts a set of ops into a causally-consistent, deterministic order.
 * Duplicate op ids are collapsed (idempotent merge).
 */
export function topoSort(ops: Op[]): Op[] {
  const seen = new Set<string>();
  const unique: Op[] = [];
  for (const op of ops) {
    if (!seen.has(op.id)) {
      seen.add(op.id);
      unique.push(op);
    }
  }
  return unique.sort(compareOps);
}