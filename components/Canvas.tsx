"use client";

import { useStore } from "@/lib/store";
import type { LayoutNode } from "@/lib/types";
import { Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

export function Canvas() {
  const state = useStore((s) => s.state);
  const selectNode = useStore((s) => s.selectNode);
  const removeNode = useStore((s) => s.removeNode);
  const moveNode = useStore((s) => s.moveNode);

  const root = state.nodes[state.rootId];
  if (!root) return null;

  return (
    <main className="flex-1 overflow-auto canvas-grid p-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg-elevated)]">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              preview
            </span>
          </div>
          <div className="p-0">
            <NodeRenderer
              nodeId={root.id}
              isRoot
              onSelect={selectNode}
              onDelete={removeNode}
              onMove={moveNode}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function PendingDot({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[var(--bg-surface)] animate-pulse z-20"
      title="Not yet synced"
    />
  );
}

function NodeRenderer({
  nodeId,
  isRoot,
  onSelect,
  onDelete,
  onMove,
}: {
  nodeId: string;
  isRoot?: boolean;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, newParentId: string, newOrder: number) => void;
}) {
  const node = useStore((s) => s.state.nodes[nodeId]);
  const selectedId = useStore((s) => s.state.selectedId);
  const pendingOps = useStore((s) => s.pendingOps);
  const [dragOver, setDragOver] = useState(false);

  if (!node) return null;

  const isSelected = selectedId === nodeId;
  const isPending = pendingOps > 0 && isSelected;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(nodeId);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-node-id", nodeId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type === "container") {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    }
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const draggedId = e.dataTransfer.getData("application/x-node-id");
    if (draggedId && draggedId !== nodeId && node.type === "container") {
      onMove(draggedId, nodeId, node.children.length);
    }
  };

  const content = renderNodeContent(node, isRoot);

  return (
    <div
      onClick={handleClick}
      draggable={!isRoot}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group transition-all ${
        isSelected ? "ring-2 ring-[var(--accent)] ring-inset" : ""
      } ${dragOver ? "ring-2 ring-emerald-400 ring-inset bg-emerald-500/5" : ""}`}
    >
      <PendingDot visible={isPending} />

      {!isRoot && (
        <div
          className={`absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelected ? "opacity-100" : ""
          }`}
        >
          <div className="h-6 w-6 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 text-[var(--text-secondary)]" />
          </div>
        </div>
      )}

      {!isRoot && isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(nodeId);
          }}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg z-10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {content}
    </div>
  );
}

function renderNodeContent(node: LayoutNode, isRoot?: boolean) {
  const cls = node.props.className ?? "";

  switch (node.type) {
    case "container":
      return (
        <div className={cls || "min-h-[200px] p-6"}>
          {node.children.length === 0 ? (
            <div className="flex items-center justify-center min-h-[120px] text-sm text-[var(--text-secondary)] border-2 border-dashed border-[var(--border)] rounded-lg">
              {isRoot ? "Add components from the palette" : "Empty container"}
            </div>
          ) : (
            node.children.map((childId) => (
              <NodeRenderer
                key={childId}
                nodeId={childId}
                onSelect={useStore.getState().selectNode}
                onDelete={useStore.getState().removeNode}
                onMove={useStore.getState().moveNode}
              />
            ))
          )}
        </div>
      );
    case "heading":
      return <h2 className={cls}>{node.props.text}</h2>;
    case "paragraph":
      return <p className={cls}>{node.props.text}</p>;
    case "button":
      return <button className={cls}>{node.props.text}</button>;
    case "image":
      return (
        <img
          src={node.props.src}
          alt={node.props.alt}
          className={cls}
          draggable={false}
        />
      );
    case "input":
      return (
        <input
          placeholder={node.props.placeholder}
          className={cls}
          readOnly
        />
      );
    case "divider":
      return <hr className={cls} />;
    default:
      return null;
  }
}