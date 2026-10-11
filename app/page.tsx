"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Toolbar } from "@/components/Toolbar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ComponentPalette } from "@/components/ComponentPalette";
import { Canvas } from "@/components/Canvas";
import { CodePanel } from "@/components/CodePanel";
import { RecoveryToast } from "@/components/RecoveryToast";

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-canvas)]">
      <Toolbar />
      <OfflineBanner />
      <div className="flex-1 flex overflow-hidden">
        <ComponentPalette />
        {hydrated ? <Canvas /> : <CanvasSkeleton />}
        {hydrated ? <CodePanel /> : <CodePanelSkeleton />}
      </div>
      <RecoveryToast />
    </div>
  );
}

/**
 * Static wireframe shown for the ~1 frame between first paint and
 * hydration completion. Matches the Canvas chrome so the swap is invisible.
 */
function CanvasSkeleton() {
  return (
    <main className="flex-1 overflow-auto canvas-grid p-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg-elevated)]">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400/50" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/50" />
              <div className="h-3 w-3 rounded-full bg-green-400/50" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              preview
            </span>
          </div>
          <div className="p-6 space-y-3">
            <div className="h-4 w-2/3 rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-3 w-full rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-8 w-24 rounded bg-[var(--bg-elevated)] animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}

function CodePanelSkeleton() {
  return (
    <aside className="w-[420px] border-l border-[var(--border)] bg-[var(--bg-surface)] flex flex-col shrink-0">
      <div className="h-12 border-b border-[var(--border)] flex items-center px-3 gap-2">
        <div className="h-4 w-4 rounded bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-3 w-28 rounded bg-[var(--bg-elevated)] animate-pulse" />
      </div>
      <div className="flex-1 p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-3 w-full rounded bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-[var(--bg-elevated)] animate-pulse" />
      </div>
      <div className="h-9 border-t border-[var(--border)] px-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-2 w-24 rounded bg-[var(--bg-elevated)] animate-pulse" />
      </div>
    </aside>
  );
}