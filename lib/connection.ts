type Status = "online" | "offline" | "reconnecting";

class ConnectionMonitor {
  private status: Status = "online";
  private listeners = new Set<(s: Status) => void>();
  private heartbeatTimer: any = null;
  private lastPong = 0;

  start(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.probe());
    window.addEventListener("offline", () => this.setStatus("offline"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.probe();
    });
    this.scheduleHeartbeat();
    this.probe();
  }

  private scheduleHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this.probe(), 15_000);
  }

  private async probe(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }
    if (this.status === "offline") this.setStatus("reconnecting");
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3_000);
      // Replace with your real endpoint; /api/ping is fine.
      const res = await fetch("/api/ping", {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      if (res.ok) {
        this.lastPong = Date.now();
        this.setStatus("online");
      } else {
        this.setStatus("offline");
      }
    } catch {
      this.setStatus("offline");
    }
  }

  private setStatus(s: Status): void {
    if (s === this.status) return;
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  get(): Status { return this.status; }

  onChange(fn: (s: Status) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }
}

export const connection = new ConnectionMonitor();