"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "./ThemeToggle";
import { SyncStatus } from "./SyncStatus";

export function Toolbar() {
  const reset = useStore((s) => s.reset);
  const clearStorage = useStore((s) => s.clearStorage);

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">
            Canvas-to-Code
          </h1>
          <p className="text-[10px] text-[var(--text-secondary)] -mt-0.5">
            Crash-safe prototyping
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SyncStatus />

        <button
          onClick={reset}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          onClick={clearStorage}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-xs font-medium text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}