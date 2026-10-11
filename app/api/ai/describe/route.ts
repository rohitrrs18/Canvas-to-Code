import { NextRequest, NextResponse } from "next/server";

type Node = {
  id: string;
  type: string;
  children: string[];
  props: Record<string, string>;
  parentId?: string | null;
};

function findRootId(tree: any): string | null {
  if (tree?.rootId && tree?.nodes?.[tree.rootId]) return tree.rootId;
  const nodes = tree?.nodes ?? tree;
  for (const id of Object.keys(nodes ?? {})) {
    if (nodes[id]?.parentId === null) return id;
  }
  return null;
}

function countTypes(nodes: Record<string, Node>, rootId: string) {
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes[id];
    if (!n) return;
    counts[n.type] = (counts[n.type] ?? 0) + 1;
    for (const c of n.children ?? []) walk(c);
  };
  walk(rootId);
  return counts;
}

function extractTexts(nodes: Record<string, Node>, rootId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes[id];
    if (!n) return;
    if (n.props?.text) out.push(n.props.text);
    for (const c of n.children ?? []) walk(c);
  };
  walk(rootId);
  return out;
}

function describe(tree: any): string {
  const nodes = (tree?.nodes ?? tree) as Record<string, Node>;
  const rootId = findRootId(tree);
  if (!rootId || !nodes?.[rootId]) {
    return "This layout is empty. Add components from the palette or generate a new layout from a prompt.";
  }

  const counts = countTypes(nodes, rootId);
  const texts = extractTexts(nodes, rootId);
  const totalNodes = Object.values(counts).reduce((a, b) => a + b, 0) - 1;

  if (totalNodes === 0) {
    return "This layout is empty. Add components from the palette or generate a new layout from a prompt.";
  }

  const parts: string[] = [];

  const c = counts.container ?? 0;
  const h = counts.heading ?? 0;
  const p = counts.paragraph ?? 0;
  const b = counts.button ?? 0;
  const i = counts.input ?? 0;
  const img = counts.image ?? 0;
  const d = counts.divider ?? 0;

  const shape: string[] = [];
  if (h) shape.push(`${h} heading${h > 1 ? "s" : ""}`);
  if (p) shape.push(`${p} paragraph${p > 1 ? "s" : ""}`);
  if (b) shape.push(`${b} button${b > 1 ? "s" : ""}`);
  if (i) shape.push(`${i} input field${i > 1 ? "s" : ""}`);
  if (img) shape.push(`${img} image${img > 1 ? "s" : ""}`);
  if (d) shape.push(`${d} divider${d > 1 ? "s" : ""}`);
  if (c) shape.push(`${c} nested container${c > 1 ? "s" : ""}`);

  parts.push(`This layout contains ${shape.join(", ")}.`);

  if (i >= 2 && b >= 1) {
    parts.push("The combination of multiple inputs with a submit button suggests a form — likely a login, signup, or contact flow.");
  } else if (b >= 2 && p >= 2) {
    parts.push("The repeated structure with multiple actions suggests a pricing or comparison section.");
  } else if (h >= 1 && img >= 1 && b >= 1) {
    parts.push("The presence of a heading, image, and call-to-action suggests a product card or feature block.");
  } else if (h >= 1 && p >= 2) {
    parts.push("The heading followed by body text suggests an article, blog post, or documentation page.");
  }

  const firstHeading = texts[0];
  if (firstHeading && firstHeading.length < 80) {
    parts.push(`The main title reads: "${firstHeading}".`);
  }

  if (b === 0 && totalNodes >= 3) {
    parts.push("Consider adding a call-to-action button to guide the user toward the next step.");
  } else if (p > 4) {
    parts.push("The layout is text-heavy — consider grouping related paragraphs into a container, or adding a divider to break up the reading flow.");
  }

  return parts.join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { currentTree?: any };
    const description = describe(body.currentTree ?? {});
    return NextResponse.json(
      { description, engine: "rule-based" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[ai/describe] failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}