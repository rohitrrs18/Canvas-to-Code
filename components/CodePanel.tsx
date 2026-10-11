"use client";

import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";
import { useStore } from "@/lib/store";

export function CodePanel() {
  const code = useStore((s) => s.code);
  const layoutHash = useStore((s) => s.layoutHash);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"html" | "jsx">("html");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="w-[420px] border-l border-[var(--border)] bg-[var(--bg-surface)] flex flex-col shrink-0">
      <div className="h-12 border-b border-[var(--border)] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Generated Code
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="h-7 px-2.5 rounded-md border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-xs leading-relaxed font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
      </div>

      <div className="h-9 border-t border-[var(--border)] px-3 flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono">
        <span>hash: {layoutHash}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          in sync
        </span>
      </div>
    </aside>
  );
}