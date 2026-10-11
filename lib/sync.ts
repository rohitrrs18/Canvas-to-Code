import type { Op } from "./types";
import { journal } from "./journal";
import { topoSort } from "./vclock";
import { persistBatch } from "./persistence";

const CHANNEL = "canvas-to-code-sync";

type Message =
  | { kind: "hello"; clientId: string; ops: Op[] }
  | { kind: "ops"; clientId: string; ops: Op[] }
  | { kind: "request-full"; clientId: string };

class SyncBus {
  private channel: BroadcastChannel | null = null;
  private clientId = "";
  private onMerge: ((ops: Op[]) => void) | null = null;

  start(clientId: string, onMerge: (ops: Op[]) => void): void {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    this.clientId = clientId;
    this.onMerge = onMerge;
    this.channel = new BroadcastChannel(CHANNEL);

    this.channel.onmessage = (e) => this.handle(e.data as Message);

    // Announce presence + request any ops we may be missing.
    this.post({ kind: "hello", clientId, ops: journal.all() });
  }

  stop(): void {
    this.channel?.close();
    this.channel = null;
  }

  broadcast(op: Op): void {
    this.post({ kind: "ops", clientId: this.clientId, ops: [op] });
  }

  private post(msg: Message): void {
    try { this.channel?.postMessage(msg); } catch { /* ignore */ }
  }

  private async handle(msg: Message): Promise<void> {
    if (msg.clientId === this.clientId) return;

    if (msg.kind === "hello") {
      // Reply with our ops so the new tab catches up.
      this.post({ kind: "ops", clientId: this.clientId, ops: journal.all() });
      // Also try to merge their ops (in case we're behind).
      await this.merge(msg.ops);
      return;
    }

    if (msg.kind === "ops") {
      await this.merge(msg.ops);
    }
  }

  private async merge(incoming: Op[]): Promise<void> {
    if (incoming.length === 0) return;
    const existing = journal.all();
    const known = new Set(existing.map((o) => o.id));
    const fresh = incoming.filter((o) => !known.has(o.id));
    if (fresh.length === 0) return;

    // Persist the merged set durably before notifying the store.
    const merged = topoSort([...existing, ...fresh]);
    await persistBatch(fresh);
    journal.reset(merged);
    this.onMerge?.(merged);
  }
}

export const syncBus = new SyncBus();

/**
 * Remote pull — used on reconnect to fetch ops we may have missed
 * while offline (e.g. another device edited the same project).
 */
export async function pullRemote(clientId: string): Promise<Op[]> {
  try {
    const res = await fetch(`/api/sync?clientId=${encodeURIComponent(clientId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { ops: Op[] };
    return data.ops ?? [];
  } catch {
    return [];
  }
}