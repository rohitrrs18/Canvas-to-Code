"use client";

import {
  Play, Square, Diamond, Database, ArrowRight,
  Box, GitBranch, User, MessageSquare,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { nanoid } from "nanoid";
import type { LayoutNode } from "@/lib/types";

const flowElements: { label: string; icon: any; kind: string }[] = [
  { label: "Start", icon: Play, kind: "start" },
  { label: "Process", icon: Square, kind: "process" },
  { label: "Decision", icon: Diamond, kind: "decision" },
  { label: "I/O", icon: Database, kind: "io" },
  { label: "End", icon: Play, kind: "end" },
];

export function DiagramPalette() {
  const addNode = useStore((s) => s.addNode);
  const state = useStore((s) => s.state);

  const nodes = Object.values(state.nodes);
  const flowNodes = nodes.filter((n) => n.type === "flow-node");
  const umlClasses = nodes.filter((n) => n.type === "uml-class");
  const seqActors = nodes.filter((n) => n.type === "seq-actor");

  const addFlowNode = (kind: string) => {
    const count = flowNodes.length;
    const isDecision = kind === "decision";
    const node: LayoutNode = {
      id: nanoid(),
      type: "flow-node",
      parentId: state.rootId,
      order: count,
      children: [],
      props: {
        kind,
        label:
          kind === "start" ? "Start"
          : kind === "end" ? "End"
          : kind === "decision" ? "Is valid?"
          : kind === "io" ? "Input"
          : "Process",
        width: isDecision ? 140 : 160,
        height: isDecision ? 80 : 60,
      },
      x: 60 + (count % 3) * 200,
      y: 60 + Math.floor(count / 3) * 140,
    };
    addNode(node.type, node.parentId!, node);
  };

  const addUmlClass = () => {
    const count = umlClasses.length;
    const node: LayoutNode = {
      id: nanoid(),
      type: "uml-class",
      parentId: state.rootId,
      order: count,
      children: [],
      props: {
        name: `Class${count + 1}`,
        attributes: ["+ id: string", "+ name: string"],
        methods: ["+ save(): void", "+ validate(): boolean"],
        width: 220,
      },
      x: 60 + (count % 2) * 300,
      y: 60 + Math.floor(count / 2) * 220,
    };
    addNode(node.type, node.parentId!, node);
  };

  const addSeqActor = () => {
    const count = seqActors.length;
    const node: LayoutNode = {
      id: nanoid(),
      type: "seq-actor",
      parentId: state.rootId,
      order: count,
      children: [],
      props: { name: `Actor${count + 1}`, width: 120 },
      x: 60 + count * 160,
      y: 20,
    };
    addNode(node.type, node.parentId!, node);
  };

  const addEdge = (edgeType: "flow-edge" | "uml-edge" | "seq-message") => {
    const candidates =
      edgeType === "flow-edge" ? flowNodes
      : edgeType === "uml-edge" ? umlClasses
      : seqActors;

    if (candidates.length < 2) {
      alert("Add at least two nodes first, then connect.");
      return;
    }

    const [from, to] = candidates.slice(-2);
    const node: LayoutNode = {
      id: nanoid(),
      type: edgeType,
      parentId: state.rootId,
      order: 0,
      children: [],
      from: from.id,
      to: to.id,
      props: {
        label:
          edgeType === "flow-edge" ? "next"
          : edgeType === "seq-message" ? "call()"
          : "",
        kind:
          edgeType === "uml-edge" ? "association"
          : edgeType === "seq-message" ? "call"
          : undefined,
      },
      y: edgeType === "seq-message" ? 120 + nodes.length * 4 : undefined,
    };
    addNode(node.type, node.parentId!, node);
  };

  return (
    <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Flowchart
        </h2>
      </div>
      <div className="p-2 flex flex-col gap-1">
        {flowElements.map(({ label, icon: Icon, kind }) => (
          <button
            key={kind}
            onClick={() => addFlowNode(kind)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
          >
            <Icon className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={() => addEdge("flow-edge")}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
        >
          <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>Connect last two</span>
        </button>
      </div>

      <div className="p-3 border-b border-t border-[var(--border)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          UML Class
        </h2>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <button
          onClick={addUmlClass}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
        >
          <Box className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>Class</span>
        </button>
        <button
          onClick={() => addEdge("uml-edge")}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
        >
          <GitBranch className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>Connect last two</span>
        </button>
      </div>

      <div className="p-3 border-b border-t border-[var(--border)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Sequence
        </h2>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <button
          onClick={addSeqActor}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
        >
          <User className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>Actor</span>
        </button>
        <button
          onClick={() => addEdge("seq-message")}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left text-sm text-[var(--text-primary)] transition-colors"
        >
          <MessageSquare className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>Connect last two</span>
        </button>
      </div>

      <div className="mt-auto p-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Drag shapes to arrange. Pick two nodes then click Connect to link them.
        </p>
      </div>
    </aside>
  );
}