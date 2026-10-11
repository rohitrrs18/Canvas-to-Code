import type { LayoutNode } from "./types";

export interface Point { x: number; y: number; }

export function nodeCenter(n: LayoutNode, w = 160, h = 60): Point {
  return { x: (n.x ?? 0) + w / 2, y: (n.y ?? 0) + h / 2 };
}

export interface FlowRender {
  shape: "rect" | "diamond" | "terminator" | "io";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderFlowNode(n: LayoutNode): FlowRender {
  const kind = n.props.kind as string | undefined;
  const shape: FlowRender["shape"] =
    kind === "decision" ? "diamond" :
    kind === "start" || kind === "end" ? "terminator" :
    kind === "io" ? "io" :
    "rect";
  return {
    shape,
    label: n.props.label ?? "Step",
    x: n.x ?? 0,
    y: n.y ?? 0,
    width: n.props.width ?? 160,
    height: n.props.height ?? 60,
  };
}

export function flowArrow(from: LayoutNode, to: LayoutNode) {
  const a = nodeCenter(from, from.props.width ?? 160, from.props.height ?? 60);
  const b = nodeCenter(to, to.props.width ?? 160, to.props.height ?? 60);
  return {
    x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    labelX: (a.x + b.x) / 2,
    labelY: (a.y + b.y) / 2 - 6,
  };
}

export interface UmlRender {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  attributes: string[];
  methods: string[];
  compartmentYs: [number, number];
}

export function renderUmlClass(n: LayoutNode): UmlRender {
  const name: string = n.props.name ?? "ClassName";
  const attributes: string[] = n.props.attributes ?? ["+ id: string"];
  const methods: string[] = n.props.methods ?? ["+ save(): void"];
  const width = n.props.width ?? 220;
  const nameH = 32;
  const lineH = 20;
  const attrsH = attributes.length * lineH + 10;
  const methodsH = methods.length * lineH + 10;
  return {
    x: n.x ?? 0,
    y: n.y ?? 0,
    width,
    height: nameH + attrsH + methodsH,
    name,
    attributes,
    methods,
    compartmentYs: [nameH, nameH + attrsH],
  };
}

export function umlEdgePath(from: LayoutNode, to: LayoutNode) {
  const a = nodeCenter(from, 220, 140);
  const b = nodeCenter(to, 220, 140);
  const kind = (from.props.kind ?? "association") as string;
  const marker =
    kind === "inheritance" ? "triangle" :
    kind === "composition" ? "diamond-filled" :
    kind === "aggregation" ? "diamond-open" :
    "arrow";
  return { path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, marker };
}

export interface SeqActorRender {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

export function renderSeqActor(n: LayoutNode): SeqActorRender {
  return {
    x: n.x ?? 80,
    y: n.y ?? 20,
    width: n.props.width ?? 120,
    height: 40,
    name: n.props.name ?? "Actor",
  };
}

export interface SeqMessageRender {
  x1: number;
  x2: number;
  y: number;
  label: string;
  dashed: boolean;
}

export function renderSeqMessage(
  n: LayoutNode,
  actors: LayoutNode[]
): SeqMessageRender | null {
  const from = actors.find((a) => a.id === n.from);
  const to = actors.find((a) => a.id === n.to);
  if (!from || !to) return null;

  const fromCenter = (from.x ?? 0) + (from.props.width ?? 120) / 2;
  const toCenter = (to.x ?? 0) + (to.props.width ?? 120) / 2;

  return {
    x1: fromCenter,
    x2: toCenter,
    y: n.y ?? 120,
    label: n.props.label ?? "message()",
    dashed: n.props.kind === "return",
  };
}