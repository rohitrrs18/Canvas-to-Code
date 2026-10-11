"use client";

import { CloudOff, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";

export function OfflineBanner() {
  const connection = useStore((s) => s.connection);
  const pendingOps = useStore((s) => s.pendingOps);
  const [dismissed, setDismissed] = useState(false);

  // Auto-reset dismissal when we come back online
  useEffect(() => {
    if (connection === "online") setDismissed(false);
  }, [connection]);

  if (connection !== "offline" || dismissed) return null;

  return (
    <div className="animate-slide-up border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
        <CloudOff className="h-3.5 w-3.5" />
        <span className="font-medium">You&apos;re offline.</span>
        <span className="opacity-80">
          Your work is saved locally and will sync automatically when you
          reconnect.
          {pendingOps > 0 && ` (${pendingOps} change${pendingOps === 1 ? "" : "s"} queued)`}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="h-6 w-6 rounded-md hover:bg-amber-500/20 flex items-center justify-center transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
      </button>
    </div>
  );
}