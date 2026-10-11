"use client";

import { useState } from "react";
import { Sparkles, Loader2, X, Wand2, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateLayout, describeLayout } from "@/lib/aiClient";

const PRESETS = [
  "A pricing page with three tiers",
  "A login form with email and password",
  "A product card with image and buy button",
  "A blog post header with title and author",
  "A hero section with headline and CTA",
  "A contact form with name, email, message",
  "A newsletter signup form",
];

export function AIComposer() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [describing, setDescribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const state = useStore((s) => s.state);
  const applyAILayout = useStore((s) => s.applyAILayout);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    setDescription(null);
    try {
      const res = await generateLayout(prompt.trim(), state.nodes);

      const rootId = state.rootId;
      const idMap = new Map<string, string>();
      const opPayloads: any[] = [];

      for (const raw of res.ops ?? []) {
        const node = (raw as any).payload?.node;
        if (!node) continue;

        const newId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID().slice(0, 10)
          : Math.random().toString(36).slice(2, 12);
        idMap.set(node.id, newId);

        const parentToken = (raw as any).payload.parentId;
        const realParentId =
          parentToken === "ROOT" || !idMap.has(parentToken)
            ? rootId
            : idMap.get(parentToken)!;

        const mappedChildren: string[] = [];
        for (const child of node.children ?? []) {
          if (idMap.has(child)) mappedChildren.push(idMap.get(child)!);
        }

        opPayloads.push({
          type: "ADD_NODE",
          payload: {
            parentId: realParentId,
            node: {
              ...node,
              id: newId,
              parentId: realParentId,
              children: mappedChildren,
            },
          },
        });
      }

      const ops = opPayloads.map((p) => ({
        id: "",
        timestamp: 0,
        clientId: "",
        vclock: {},
        type: p.type,
        payload: p.payload,
      })) as any;

      applyAILayout(ops);
      setOpen(false);
      setPrompt("");
    } catch (err: any) {
      setError(err?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDescribe = async () => {
    setDescribing(true);
    setError(null);
    try {
      const res = await describeLayout({
        rootId: state.rootId,
        nodes: state.nodes,
      });
      setDescription(res.description);
    } catch (err: any) {
      setError(err?.message ?? "Describe failed");
    } finally {
      setDescribing(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-lg border border-[var(--border)] bg-gradient-to-r from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20 text-xs font-medium text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
        AI Layout
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && !describing && setOpen(false)}
    >
      <div
        className="w-[560px] rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold">Layout assistant</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              local · no API
            </span>
          </div>
          <button
            onClick={() => !busy && !describing && setOpen(false)}
            className="h-7 w-7 rounded-md hover:bg-[var(--bg-elevated)] flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the layout you want…"
            disabled={busy}
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors resize-none"
          />

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                disabled={busy}
                className="text-[10px] px-2 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-xs text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {description && (
            <div className="text-xs text-[var(--text-primary)] border border-[var(--border)] bg-[var(--bg-elevated)] rounded-md px-3 py-2 leading-relaxed">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Layout analysis
              </div>
              {description}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <button
            onClick={handleDescribe}
            disabled={describing || busy}
            className="h-8 px-3 rounded-md text-xs border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {describing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Describe current layout
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={busy || describing}
              className="h-8 px-3 rounded-md text-xs border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={busy || !prompt.trim()}
              className="h-8 px-3 rounded-md text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {busy ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}