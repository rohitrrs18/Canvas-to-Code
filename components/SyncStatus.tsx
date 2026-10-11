"use client";

import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";

export function SyncStatus() {
  const connection = useStore((s) => s.connection);
  const pendingOps = useStore((s) => s.pendingOps);
  const lastSavedAt = useStore((s) => s.lastSavedAt);

  if (connection === "offline") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
        <CloudOff className="h-3 w-3" />
        <span>Offline{pendingOps > 0 ? ` · ${pendingOps} queued` : ""}</span>
      </div>
    );
  }

  if (connection === "reconnecting" || pendingOps > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing{pendingOps > 0 ? ` · ${pendingOps}` : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
      <CheckCircle2 className="h-3 w-3" />
      <span>Synced</span>
    </div>
  );
}