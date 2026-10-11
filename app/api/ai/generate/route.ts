import { NextRequest, NextResponse } from "next/server";

type Op = {
  type: "ADD_NODE";
  payload: {
    parentId: string;
    node: {
      id: string;
      type: string;
      parentId: string;
      order: number;
      children: string[];
      props: Record<string, any>;
      x?: number;
      y?: number;
      from?: string;
      to?: string;
    };
  };
};

let counter = 0;
function nid(prefix = "n") {
  counter++;
  return `${prefix}${counter}_${Math.random().toString(36).slice(2, 6)}`;
}

function node(
  type: string,
  props: Record<string, any>,
  parentId = "ROOT",
  children: string[] = [],
  extras: Partial<Op["payload"]["node"]> = {}
): Op["payload"]["node"] {
  return { id: nid(type[0]), type, parentId, order: 0, children, props, ...extras };
}

function addNode(parentId: string, n: Op["payload"]["node"]): Op {
  return { type: "ADD_NODE", payload: { parentId, node: { ...n, parentId } } };
}

/* ---------------------------- UI Recipes ---------------------------- */

function recipeLogin(): Op[] {
  const email = node("input", { placeholder: "you@example.com", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const password = node("input", { placeholder: "••••••••", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const submit = node("button", { text: "Sign in", className: "w-full px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  const title = node("heading", { text: "Welcome back", className: "text-2xl font-semibold" });
  const sub = node("paragraph", { text: "Sign in to continue to your account.", className: "text-sm opacity-70" });
  return [addNode("ROOT", title), addNode("ROOT", sub), addNode("ROOT", email), addNode("ROOT", password), addNode("ROOT", submit)];
}

function recipePricing(): Op[] {
  const title = node("heading", { text: "Simple, transparent pricing", className: "text-3xl font-semibold text-center" });
  const tiers = [
    { name: "Starter", price: "$0 / month", cta: "Get started" },
    { name: "Pro", price: "$19 / month", cta: "Start free trial" },
    { name: "Team", price: "$49 / month", cta: "Contact sales" },
  ];
  const ops: Op[] = [addNode("ROOT", title)];
  for (const t of tiers) {
    const h = node("heading", { text: t.name, className: "text-xl font-semibold" });
    const p = node("paragraph", { text: t.price, className: "text-2xl font-bold" });
    const b = node("button", { text: t.cta, className: "mt-2 px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
    const card = node("container", { className: "flex flex-col gap-3 p-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" }, "ROOT", [h.id, p.id, b.id]);
    ops.push(addNode("ROOT", card));
    ops.push(addNode(card.id, h));
    ops.push(addNode(card.id, p));
    ops.push(addNode(card.id, b));
  }
  return ops;
}

function recipeProductCard(): Op[] {
  const img = node("image", { src: "https://placehold.co/600x400", alt: "Product", className: "w-full rounded-lg" });
  const name = node("heading", { text: "Aurora Headphones", className: "text-xl font-semibold" });
  const desc = node("paragraph", { text: "Studio-grade sound with 40-hour battery life and adaptive noise cancellation.", className: "text-sm opacity-80" });
  const price = node("paragraph", { text: "$249", className: "text-lg font-bold" });
  const buy = node("button", { text: "Add to cart", className: "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  const card = node("container", { className: "flex flex-col gap-3 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-sm" }, "ROOT", [img.id, name.id, desc.id, price.id, buy.id]);
  return [addNode("ROOT", card), addNode(card.id, img), addNode(card.id, name), addNode(card.id, desc), addNode(card.id, price), addNode(card.id, buy)];
}

function recipeBlogPost(): Op[] {
  const title = node("heading", { text: "How resilient state changed the way we build editors", className: "text-3xl font-semibold" });
  const meta = node("paragraph", { text: "By Rohit · 6 min read · Oct 2025", className: "text-sm opacity-60" });
  const divider = node("divider", { className: "border-t border-slate-300 dark:border-slate-700 my-2" });
  const lead = node("paragraph", { text: "Every editor that loses work has failed its user. Here's how op-logs fix that.", className: "text-base opacity-80" });
  const body = node("paragraph", { text: "We built Canvas-to-Code on an append-only operation log.", className: "text-base opacity-80" });
  return [addNode("ROOT", title), addNode("ROOT", meta), addNode("ROOT", divider), addNode("ROOT", lead), addNode("ROOT", body)];
}

function recipeHero(): Op[] {
  const title = node("heading", { text: "Build faster with a canvas that never loses your work", className: "text-4xl font-bold text-center" });
  const sub = node("paragraph", { text: "A crash-safe prototyping board that compiles to Tailwind HTML.", className: "text-lg opacity-70 text-center max-w-2xl mx-auto" });
  const cta = node("button", { text: "Get started", className: "mx-auto px-6 py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  return [addNode("ROOT", title), addNode("ROOT", sub), addNode("ROOT", cta)];
}

function recipeContact(): Op[] {
  const title = node("heading", { text: "Get in touch", className: "text-2xl font-semibold" });
  const name = node("input", { placeholder: "Your name", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const email = node("input", { placeholder: "you@example.com", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const msg = node("input", { placeholder: "How can we help?", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const submit = node("button", { text: "Send message", className: "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  return [addNode("ROOT", title), addNode("ROOT", name), addNode("ROOT", email), addNode("ROOT", msg), addNode("ROOT", submit)];
}

function recipeNewsletter(): Op[] {
  const title = node("heading", { text: "Join the newsletter", className: "text-2xl font-semibold text-center" });
  const sub = node("paragraph", { text: "Monthly notes on local-first software.", className: "text-sm opacity-70 text-center" });
  const email = node("input", { placeholder: "you@example.com", className: "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" });
  const cta = node("button", { text: "Subscribe", className: "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  return [addNode("ROOT", title), addNode("ROOT", sub), addNode("ROOT", email), addNode("ROOT", cta)];
}

function recipeFallback(prompt: string): Op[] {
  const clean = prompt.trim() || "New layout";
  const title = node("heading", { text: clean.charAt(0).toUpperCase() + clean.slice(1), className: "text-3xl font-semibold" });
  const sub = node("paragraph", { text: `A starting point for: ${clean}.`, className: "text-base opacity-70" });
  const cta = node("button", { text: "Get started", className: "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" });
  const divider = node("divider", { className: "border-t border-slate-300 dark:border-slate-700 my-4" });
  const body = node("paragraph", { text: "Add more components, or try another prompt.", className: "text-sm opacity-60" });
  return [addNode("ROOT", title), addNode("ROOT", sub), addNode("ROOT", divider), addNode("ROOT", cta), addNode("ROOT", body)];
}

/* ------------------------- Diagram Recipes ------------------------- */

function recipeFlowchart(): Op[] {
  const ops: Op[] = [];
  const mk = (
    id: string, kind: string, label: string,
    x: number, y: number, w: number, h: number
  ): Op => addNode("ROOT", {
    id, type: "flow-node", parentId: "ROOT", order: 0, children: [],
    props: { kind, label, width: w, height: h },
    x, y,
  } as any);

  ops.push(mk("n_start", "start", "Start", 260, 40, 120, 40));
  ops.push(mk("n_step", "process", "Process data", 240, 140, 160, 60));
  ops.push(mk("n_dec", "decision", "Is valid?", 250, 260, 140, 80));
  ops.push(mk("n_err", "io", "Handle error", 60, 400, 160, 60));
  ops.push(mk("n_save", "process", "Save result", 440, 400, 160, 60));
  ops.push(mk("n_end", "end", "End", 260, 520, 120, 40));

  const edge = (from: string, to: string, label: string): Op => addNode("ROOT", {
    id: `e_${from}_${to}`, type: "flow-edge", parentId: "ROOT",
    order: 0, children: [], from, to, props: { label },
  } as any);

  ops.push(edge("n_start", "n_step", ""));
  ops.push(edge("n_step", "n_dec", ""));
  ops.push(edge("n_dec", "n_err", "no"));
  ops.push(edge("n_dec", "n_save", "yes"));
  ops.push(edge("n_err", "n_end", ""));
  ops.push(edge("n_save", "n_end", ""));

  return ops;
}

function recipeUmlClass(): Op[] {
  const ops: Op[] = [];
  const mk = (
    id: string, name: string, attrs: string[], methods: string[], x: number, y: number
  ): Op => addNode("ROOT", {
    id, type: "uml-class", parentId: "ROOT", order: 0, children: [],
    props: { name, attributes: attrs, methods, width: 220 },
    x, y,
  } as any);

  ops.push(mk("cls_user", "User",
    ["+ id: string", "+ email: string", "+ role: Role"],
    ["+ login(): boolean", "+ logout(): void"],
    80, 80));

  ops.push(mk("cls_admin", "Admin",
    ["+ permissions: string[]"],
    ["+ approve(id): void"],
    420, 80));

  ops.push(mk("cls_session", "Session",
    ["+ token: string", "+ userId: string"],
    ["+ refresh(): void"],
    80, 320));

  const edge = (id: string, from: string, to: string, kind: string): Op => addNode("ROOT", {
    id, type: "uml-edge", parentId: "ROOT",
    order: 0, children: [], from, to, props: { kind },
  } as any);

  ops.push(edge("e_admin_user", "cls_admin", "cls_user", "inheritance"));
  ops.push(edge("e_session_user", "cls_session", "cls_user", "association"));

  return ops;
}

function recipeSequence(): Op[] {
  const ops: Op[] = [];
  const actors = [
    { id: "a_user", name: "User", x: 80 },
    { id: "a_api", name: "API", x: 260 },
    { id: "a_db", name: "Database", x: 440 },
  ];

  for (const a of actors) {
    ops.push(addNode("ROOT", {
      id: a.id, type: "seq-actor", parentId: "ROOT", order: 0, children: [],
      props: { name: a.name, width: 120 },
      x: a.x, y: 20,
    } as any));
  }

  const msg = (id: string, from: string, to: string, label: string, y: number, kind = "call"): Op =>
    addNode("ROOT", {
      id, type: "seq-message", parentId: "ROOT",
      order: 0, children: [], from, to, y,
      props: { label, kind },
    } as any);

  ops.push(msg("m1", "a_user", "a_api", "POST /login", 120));
  ops.push(msg("m2", "a_api", "a_db", "query user", 170));
  ops.push(msg("m3", "a_db", "a_api", "user record", 220, "return"));
  ops.push(msg("m4", "a_api", "a_user", "200 OK + token", 270, "return"));

  return ops;
}

/* --------------------------- Matching --------------------------- */

function pickRecipe(prompt: string): Op[] {
  const p = prompt.toLowerCase();

  // Diagrams first
  if (/\b(sequence\s*diagram|sequence)\b/.test(p)) return recipeSequence();
  if (/\b(uml|class\s*diagram|class diagram|classes)\b/.test(p)) return recipeUmlClass();
  if (/\b(flowchart|flow\s*chart|flow chart|flow)\b/.test(p)) return recipeFlowchart();

  // UI recipes
  if (/\b(login|sign\s*in|signin|auth)\b/.test(p)) return recipeLogin();
  if (/\b(pricing|price|plans?|tiers?)\b/.test(p)) return recipePricing();
  if (/\b(product|card|shop|store|buy|cart|ecommerce)\b/.test(p)) return recipeProductCard();
  if (/\b(blog|article|post|story)\b/.test(p)) return recipeBlogPost();
  if (/\b(hero|landing|header|jumbotron)\b/.test(p)) return recipeHero();
  if (/\b(contact|form|inquiry|support)\b/.test(p)) return recipeContact();
  if (/\b(newsletter|subscribe|email\s*list|waitlist)\b/.test(p)) return recipeNewsletter();

  return recipeFallback(prompt);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const ops = pickRecipe(prompt);
    return NextResponse.json(
      { ops, engine: "rule-based" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[ai/generate] failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}