import type { Op } from "./types";
import { journal } from "./journal";
import { connection } from "./connection";

const MAX_BACKOFF = 30_000;
const BASE_BACKOFF = 500;
const SAFETY_INTERVAL = 20_000;

class Outbox {
  private flushing = false;
  private backoff = BASE_BACKOFF;
  private timer: any = null;
  private safetyTimer: any = null;
  private unsub: (() => void) | null = null;
  private retryHandler: (() => void) | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    // React to connectivity changes — flush immediately on reconnect.
    this.unsub = connection.onChange((status) => {
      if (status === "online") this.scheduleFlush(0);
    });

    // Manual retry from the palette's "Retry" button.
    if (typeof window !== "undefined") {
      this.retryHandler = () => this.scheduleFlush(0);
      window.addEventListener("retry-sync", this.retryHandler);

      // Flush when the tab becomes visible again.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.scheduleFlush(0);
        }
      });
    }

    // Periodic safety flush — catches any op that slipped past enqueue().
    this.safetyTimer = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      this.scheduleFlush(0);
    }, SAFETY_INTERVAL);
  }

  stop(): void {
    if (this.unsub) this.unsub();
    if (this.retryHandler && typeof window !== "undefined") {
      window.removeEventListener("retry-sync", this.retryHandler);
    }
    clearTimeout(this.timer);
    clearInterval(this.safetyTimer);
    this.timer = null;
    this.safetyTimer = null;
    this.retryHandler = null;
    this.unsub = null;
    this.started = false;
  }

  /** Called from the store after every commit. Fire-and-forget. */
  enqueue(_op: Op): void {
    if (connection.get() === "online") this.scheduleFlush(0);
  }

  /** Force an immediate flush — used by the palette Retry button. */
  retryNow(): void {
    this.backoff = BASE_BACKOFF;
    this.scheduleFlush(0);
  }

  /**
   * Wait for any in-flight flush to complete before resolving.
   * Used by pullAndMerge to guarantee a stable local snapshot.
   * Best-effort: resolves within ~2s even if the flush hangs.
   */
  async drain(): Promise<void> {
    if (!this.flushing) return;
    const deadline = Date.now() + 2_000;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!this.flushing || Date.now() > deadline) {
          resolve();
          return;
        }
        setTimeout(check, 25);
      };
      check();
    });
  }

  private scheduleFlush(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), delay);
  }

  /**
   * Broadcast the current pending count to anyone listening.
   * The store subscribes to this to keep its `pendingOps` field fresh.
   */
  private notifyPending(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ops-synced", {
        detail: { pendingOps: journal.pending().length },
      })
    );
  }

  private async flush(): Promise<void> {
    if (this.flushing) return;
    if (connection.get() !== "online") return;

    const pending = journal.pending();
    if (pending.length === 0) {
      this.backoff = BASE_BACKOFF;
      this.notifyPending();
      return;
    }

    this.flushing = true;
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: pending }),
      });
      if (!res.ok) throw new Error(`sync failed: ${res.status}`);

      // Mark every op in the batch as remotely durable.
      pending.forEach((op) => journal.markDurable(op.id, 2));
      this.backoff = BASE_BACKOFF;

      // CRITICAL: notify subscribers so the store can recompute pendingOps.
      this.notifyPending();
    } catch {
      // Exponential backoff, capped.
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
      this.scheduleFlush(this.backoff);
      // Also notify on failure so the UI reflects the still-pending count.
      this.notifyPending();
    } finally {
      this.flushing = false;
    }
  }
}

export const outbox = new Outbox();