"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import type { LayoutNode } from "@/lib/types";
import {
  renderFlowNode,
  renderUmlClass,
  renderSeqActor,
  renderSeqMessage,
  flowArrow,
  umlEdgePath,
} from "@/lib/diagramRenderer";

export function DiagramCanvas() {
  const state = useStore((s) => s.state);
  const selectNode = useStore((s) => s.selectNode);
  const moveNode = useStore((s) => s.moveNode);
  const removeNode = useStore((s) => s.removeNode);

  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = Object.values(state.nodes);
  const flowNodes = nodes.filter((n) => n.type === "flow-node");
  const flowEdges = nodes.filter((n) => n.type === "flow-edge");
  const umlClasses = nodes.filter((n) => n.type === "uml-class");
  const umlEdges = nodes.filter((n) => n.type === "uml-edge");
  const seqActors = nodes.filter((n) => n.type === "seq-actor");
  const seqMessages = nodes.filter((n) => n.type === "seq-message");

  const hasFlow = flowNodes.length > 0;
  const hasUml = umlClasses.length > 0;
  const hasSeq = seqActors.length > 0;

  const cursorToSvg = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: cursor.x, y: cursor.y };
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = state.nodes[id];
    if (!node) return;
    const cursor = cursorToSvg(e);
    setDragging({ id, dx: cursor.x - (node.x ?? 0), dy: cursor.y - (node.y ?? 0) });
    selectNode(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const cursor = cursorToSvg(e);
    const newX = Math.round(cursor.x - dragging.dx);
    const newY = Math.round(cursor.y - dragging.dy);
    const node = state.nodes[dragging.id];
    if (!node) return;
    moveNode(dragging.id, node.parentId ?? state.rootId, 0, newX, newY);
  };

  const handleMouseUp = () => setDragging(null);

  const selectedNode = state.selectedId ? state.nodes[state.selectedId] : null;

  return (
    <main className="flex-1 overflow-auto canvas-grid p-8">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden min-h-[500px]">
        <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              {hasFlow ? "flowchart" : hasSeq ? "sequence" : hasUml ? "class diagram" : "diagram"}
            </span>
          </div>
          {selectedNode && (
            <button
              onClick={() => removeNode(selectedNode.id)}
              className="text-[10px] px-2 py-1 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete selected
            </button>
          )}
        </div>

        <svg
          ref={svgRef}
          className="w-full h-[600px] select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => selectNode(null)}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" />
            </marker>
            <marker id="triangle" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto">
              <path d="M 0 0 L 12 6 L 0 12 Z" fill="var(--bg-surface)" stroke="var(--text-secondary)" strokeWidth="1" />
            </marker>
            <marker id="diamond-filled" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto">
              <path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill="var(--text-secondary)" />
            </marker>
            <marker id="diamond-open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto">
              <path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill="var(--bg-surface)" stroke="var(--text-secondary)" strokeWidth="1" />
            </marker>
          </defs>

          {hasFlow && (
            <>
              {flowEdges.map((e) => {
                const from = state.nodes[e.from!];
                const to = state.nodes[e.to!];
                if (!from || !to) return null;
                const { x1, y1, x2, y2, labelX, labelY } = flowArrow(from, to);
                return (
                  <g key={e.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="var(--text-secondary)" strokeWidth="2" markerEnd="url(#arrow)" />
                    {e.props.label && (
                      <text x={labelX} y={labelY} textAnchor="middle"
                        className="fill-[var(--text-secondary)] text-[11px]">
                        {e.props.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {flowNodes.map((n) => {
                const r = renderFlowNode(n);
                const isSelected = state.selectedId === n.id;
                const stroke = isSelected ? "var(--accent)" : "var(--border)";
                const fill = "var(--bg-elevated)";
                const textFill = "var(--text-primary)";
                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;

                let shape: React.ReactNode;
                if (r.shape === "diamond") {
                  const pts = `${cx},${r.y} ${r.x + r.width},${cy} ${cx},${r.y + r.height} ${r.x},${cy}`;
                  shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="2" />;
                } else if (r.shape === "terminator") {
                  shape = <rect x={r.x} y={r.y} width={r.width} height={r.height}
                    rx={r.height / 2} ry={r.height / 2} fill={fill} stroke={stroke} strokeWidth="2" />;
                } else if (r.shape === "io") {
                  const skew = 16;
                  const pts = `${r.x + skew},${r.y} ${r.x + r.width},${r.y} ${r.x + r.width - skew},${r.y + r.height} ${r.x},${r.y + r.height}`;
                  shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="2" />;
                } else {
                  shape = <rect x={r.x} y={r.y} width={r.width} height={r.height}
                    rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth="2" />;
                }

                return (
                  <g key={n.id} onMouseDown={(e) => handleMouseDown(e, n.id)} className="cursor-move">
                    {shape}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fill={textFill} className="text-[13px] pointer-events-none font-medium">
                      {r.label}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {hasUml && (
            <>
              {umlEdges.map((e) => {
                const from = state.nodes[e.from!];
                const to = state.nodes[e.to!];
                if (!from || !to) return null;
                const { path, marker } = umlEdgePath(from, to);
                return (
                  <path key={e.id} d={path} fill="none"
                    stroke="var(--text-secondary)" strokeWidth="2"
                    markerEnd={`url(#${marker})`} />
                );
              })}

              {umlClasses.map((n) => {
                const r = renderUmlClass(n);
                const isSelected = state.selectedId === n.id;
                const stroke = isSelected ? "var(--accent)" : "var(--border)";
                const fill = "var(--bg-elevated)";
                const textFill = "var(--text-primary)";
                return (
                  <g key={n.id} onMouseDown={(e) => handleMouseDown(e, n.id)} className="cursor-move">
                    <rect x={r.x} y={r.y} width={r.width} height={r.height}
                      fill={fill} stroke={stroke} strokeWidth="2" rx="4" />
                    <line x1={r.x} y1={r.y + r.compartmentYs[0]}
                      x2={r.x + r.width} y2={r.y + r.compartmentYs[0]}
                      stroke={stroke} strokeWidth="1" />
                    <line x1={r.x} y1={r.y + r.compartmentYs[1]}
                      x2={r.x + r.width} y2={r.y + r.compartmentYs[1]}
                      stroke={stroke} strokeWidth="1" />
                    <text x={r.x + r.width / 2} y={r.y + r.compartmentYs[0] / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={textFill} className="text-[13px] font-semibold pointer-events-none">
                      {r.name}
                    </text>
                    {r.attributes.map((a, i) => (
                      <text key={i} x={r.x + 8} y={r.y + r.compartmentYs[0] + 20 + i * 20}
                        fill={textFill} className="text-[11px] pointer-events-none">
                        {a}
                      </text>
                    ))}
                    {r.methods.map((m, i) => (
                      <text key={i} x={r.x + 8} y={r.y + r.compartmentYs[1] + 20 + i * 20}
                        fill={textFill} className="text-[11px] pointer-events-none">
                        {m}
                      </text>
                    ))}
                  </g>
                );
              })}
            </>
          )}

          {hasSeq && (
            <>
              {seqActors.map((a) => {
                const r = renderSeqActor(a);
                const isSelected = state.selectedId === a.id;
                const stroke = isSelected ? "var(--accent)" : "var(--border)";
                const fill = "var(--bg-elevated)";
                const textFill = "var(--text-primary)";
                return (
                  <g key={a.id} onMouseDown={(e) => handleMouseDown(e, a.id)} className="cursor-move">
                    <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={6}
                      fill={fill} stroke={stroke} strokeWidth="2" />
                    <text x={r.x + r.width / 2} y={r.y + r.height / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={textFill} className="text-[12px] font-medium pointer-events-none">
                      {r.name}
                    </text>
                    <line x1={r.x + r.width / 2} y1={r.y + r.height}
                      x2={r.x + r.width / 2} y2={520}
                      stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="4 4" />
                  </g>
                );
              })}

              {seqMessages.map((m) => {
                const r = renderSeqMessage(m, seqActors);
                if (!r) return null;
                const arrowEnd = r.x1 < r.x2 ? r.x2 - 8 : r.x2 + 8;
                return (
                  <g key={m.id}>
                    <line x1={r.x1} y1={r.y} x2={arrowEnd} y2={r.y}
                      stroke="var(--text-primary)" strokeWidth="1.5"
                      strokeDasharray={r.dashed ? "4 4" : undefined}
                      markerEnd="url(#arrow)" />
                    <text x={(r.x1 + r.x2) / 2} y={r.y - 6}
                      textAnchor="middle" className="fill-[var(--text-primary)] text-[11px]">
                      {r.label}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {!hasFlow && !hasUml && !hasSeq && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
              className="fill-[var(--text-secondary)] text-sm">
              Add diagram elements from the palette, or use AI Layout to generate one.
            </text>
          )}
        </svg>
      </div>
    </main>
  );
}