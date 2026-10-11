import type { LayoutState } from "./types";

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function compileToMermaid(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const hasFlow = nodes.some((n) => n.type === "flow-node");
  const hasUml = nodes.some((n) => n.type === "uml-class");
  const hasSeq = nodes.some((n) => n.type === "seq-actor");

  if (hasFlow) return mermaidFlowchart(state);
  if (hasSeq) return mermaidSequence(state);
  if (hasUml) return mermaidClassDiagram(state);
  return "%% No diagram to export";
}

function mermaidFlowchart(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const flowNodes = nodes.filter((n) => n.type === "flow-node");
  const edges = nodes.filter((n) => n.type === "flow-edge");
  const lines: string[] = ["flowchart TD"];

  for (const n of flowNodes) {
    const id = safeId(n.id);
    const label = n.props.label ?? "Step";
    const kind = n.props.kind ?? "process";
    if (kind === "start" || kind === "end") {
      lines.push(`  ${id}(["${label}"])`);
    } else if (kind === "decision") {
      lines.push(`  ${id}{"${label}"}`);
    } else if (kind === "io") {
      lines.push(`  ${id}[/"${label}"/]`);
    } else {
      lines.push(`  ${id}["${label}"]`);
    }
  }

  for (const e of edges) {
    if (!e.from || !e.to) continue;
    const label = e.props.label ? `|${e.props.label}|` : "";
    lines.push(`  ${safeId(e.from)} -->${label} ${safeId(e.to)}`);
  }

  return lines.join("\n");
}

function mermaidSequence(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const actors = nodes.filter((n) => n.type === "seq-actor");
  const messages = nodes
    .filter((n) => n.type === "seq-message")
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

  const lines: string[] = ["sequenceDiagram"];
  for (const a of actors) {
    lines.push(`  participant ${safeId(a.id)} as ${a.props.name ?? "Actor"}`);
  }
  for (const m of messages) {
    if (!m.from || !m.to) continue;
    const arrow = m.props.kind === "return" ? "-->>" : "->>";
    lines.push(`  ${safeId(m.from)}${arrow}${safeId(m.to)}: ${m.props.label ?? ""}`);
  }
  return lines.join("\n");
}

function mermaidClassDiagram(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const classes = nodes.filter((n) => n.type === "uml-class");
  const edges = nodes.filter((n) => n.type === "uml-edge");
  const lines: string[] = ["classDiagram"];

  for (const c of classes) {
    lines.push(`  class ${c.props.name ?? "Class"}`);
    for (const a of c.props.attributes ?? []) {
      lines.push(`    ${c.props.name} : ${String(a).replace(/^[+\-#~]\s*/, "")}`);
    }
    for (const m of c.props.methods ?? []) {
      lines.push(`    ${c.props.name} : ${String(m).replace(/^[+\-#~]\s*/, "")}`);
    }
  }

  const classById = new Map(classes.map((c) => [c.id, c.props.name]));
  for (const e of edges) {
    const from = classById.get(e.from!);
    const to = classById.get(e.to!);
    if (!from || !to) continue;
    const kind = e.props.kind ?? "association";
    const arrow =
      kind === "inheritance" ? "<|--" :
      kind === "composition" ? "*--" :
      kind === "aggregation" ? "o--" :
      kind === "dependency" ? "..>" :
      "-->";
    lines.push(`  ${from} ${arrow} ${to}`);
  }

  return lines.join("\n");
}

export function compileToPlantUml(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const hasFlow = nodes.some((n) => n.type === "flow-node");
  const hasUml = nodes.some((n) => n.type === "uml-class");
  const hasSeq = nodes.some((n) => n.type === "seq-actor");

  if (hasFlow) return plantFlowchart(state);
  if (hasSeq) return plantSequence(state);
  if (hasUml) return plantClassDiagram(state);
  return "' No diagram to export";
}

function plantFlowchart(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const flowNodes = nodes.filter((n) => n.type === "flow-node");
  const lines: string[] = ["@startuml"];
  for (const n of flowNodes) {
    const label = n.props.label ?? "Step";
    const kind = n.props.kind ?? "process";
    if (kind === "start" || kind === "end") continue;
    if (kind === "decision") lines.push(`if (${label}) then (yes)`);
    else lines.push(`:${label};`);
  }
  lines.push("@enduml");
  return lines.join("\n");
}

function plantSequence(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const actors = nodes.filter((n) => n.type === "seq-actor");
  const messages = nodes
    .filter((n) => n.type === "seq-message")
    .sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

  const lines: string[] = ["@startuml"];
  for (const a of actors) {
    lines.push(`participant "${a.props.name ?? "Actor"}" as ${safeId(a.id)}`);
  }
  for (const m of messages) {
    if (!m.from || !m.to) continue;
    const arrow = m.props.kind === "return" ? "-->" : "->";
    lines.push(`${safeId(m.from)} ${arrow} ${safeId(m.to)}: ${m.props.label ?? ""}`);
  }
  lines.push("@enduml");
  return lines.join("\n");
}

function plantClassDiagram(state: LayoutState): string {
  const nodes = Object.values(state.nodes);
  const classes = nodes.filter((n) => n.type === "uml-class");
  const edges = nodes.filter((n) => n.type === "uml-edge");
  const lines: string[] = ["@startuml"];

  for (const c of classes) {
    lines.push(`class ${c.props.name ?? "Class"} {`);
    for (const a of c.props.attributes ?? []) lines.push(`  ${a}`);
    for (const m of c.props.methods ?? []) lines.push(`  ${m}`);
    lines.push("}");
  }

  const classById = new Map(classes.map((c) => [c.id, c.props.name]));
  for (const e of edges) {
    const from = classById.get(e.from!);
    const to = classById.get(e.to!);
    if (!from || !to) continue;
    const kind = e.props.kind ?? "association";
    const arrow =
      kind === "inheritance" ? "<|--" :
      kind === "composition" ? "*--" :
      kind === "aggregation" ? "o--" :
      kind === "dependency" ? "..>" :
      "-->";
    lines.push(`${from} ${arrow} ${to}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}