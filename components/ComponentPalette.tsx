"use client";

import {
  Box,
  Type,
  AlignLeft,
  MousePointerClick,
  Image as ImageIcon,
  TextCursorInput,
  Minus,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { ComponentType } from "@/lib/types";

const components: { type: ComponentType; label: string; icon: any }[] = [
  { type: "container", label: "Container", icon: Box },
  { type: "heading", label: "Heading", icon: Type },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "input", label: "Input", icon: TextCursorInput },
  { type: "divider", label: "Divider", icon: Minus },
];

export function ComponentPalette() {
  const addNode = useStore((s) => s.addNode);
  const selectedId = useStore((s) => s.state.selectedId);
  const nodes = useStore((s) => s.state.nodes);
  const pendingOps = useStore((s) => s.pendingOps);
  const connection = useStore((s) => s.connection);

  const handleAdd = (type: ComponentType) => {
    const target =
      selectedId && nodes[selectedId]?.type === "container"
        ? selectedId
        : undefined;
    addNode(type, target);
  };

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("retry-sync"));
    }
  };

  return (
    <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col shrink-0">
      <div className="p-3 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Components
        </h2>
      </div>

      <div className="p-2 flex flex-col gap-1 overflow-y-auto">
        {components.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => handleAdd(type)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
          >
            <Icon className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto p-3 border-t border-[var(--border)] space-y-2">
        {pendingOps > 0 && (
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingOps} unsynced
            </span>
            {connection === "online" && (
              <button
                onClick={handleRetry}
                className="hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Retry
              </button>
            )}
          </div>
        )}

        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Select a container, then add — new nodes nest inside. Every change is
          saved locally within a frame.
        </p>
      </div>
    </aside>
  );
}