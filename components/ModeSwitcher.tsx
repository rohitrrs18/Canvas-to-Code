"use client";

import { Layout, GitBranch } from "lucide-react";
import { useStore } from "@/lib/store";

export function ModeSwitcher() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div className="flex items-center gap-0.5 border border-[var(--border)] rounded-lg p-0.5 ml-2">
      <button
        onClick={() => setMode("ui")}
        className={`h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
          mode === "ui"
            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Layout className="h-3.5 w-3.5" />
        UI
      </button>
      <button
        onClick={() => setMode("diagram")}
        className={`h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
          mode === "diagram"
            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <GitBranch className="h-3.5 w-3.5" />
        Diagram
      </button>
    </div>
  );
}