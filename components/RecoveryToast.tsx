"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

export function RecoveryToast() {
  const [info, setInfo] = useState<{ opCount: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { opCount: number };
      setInfo(detail);
      setTimeout(() => setInfo(null), 3000);
    };
    window.addEventListener("session-restored", handler);
    return () => window.removeEventListener("session-restored", handler);
  }, []);

  if (!info) return null;

  return (
    <div className="fixed bottom-4 right-4 animate-slide-up z-50">
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg">
        <History className="h-3.5 w-3.5 text-[var(--accent)]" />
        <span className="text-xs text-[var(--text-primary)]">
          Session restored
          {info.opCount > 0 && (
            <span className="text-[var(--text-secondary)]">
              {" "}· {info.opCount} change{info.opCount === 1 ? "" : "s"} replayed
            </span>
          )}
        </span>
      </div>
    </div>
  );
}