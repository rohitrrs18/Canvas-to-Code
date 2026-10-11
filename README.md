<div align="center">

# Canvas-to-Code

### A crash-safe, offline-first visual editor that compiles drag-and-drop layouts into clean HTML + Tailwind, and diagrams into Mermaid and PlantUML — with zero data loss and zero paid APIs.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

[The Problem](#the-problem) · [The Insight](#the-insight) · [Features](#features) · [Architecture](#architecture) · [AI Without APIs](#ai-without-apis) · [Verification](#verification) · [Deploy](#deploy)

</div>

---

## The Problem

**Every creative tool eventually loses someone's work.**

You've been designing for three hours. Your battery dies. Or the tab crashes. Or your Wi-Fi drops mid-drag. When you come back, everything is gone — or worse, half-saved and corrupted.

This isn't a rare edge case. It's the default behaviour of most browser-based editors, which assume a healthy session and continuous connectivity:

| Failure | What users lose |
|---|---|
| Laptop battery dies mid-drag | Unsaved work since the last autosave |
| Tab crashes | All in-memory state |
| Wi-Fi drops | Editor freezes; further edits are impossible |
| Two tabs open | Last-write-wins overwrites the other tab silently |

The cost is real. Designers redo work. Teams lose hours. Users learn to distrust their tools.

**Canvas-to-Code exists to prove a different default is possible: a visual editor that cannot lose your work.**

---

## The Insight

Most prototypes reach for one of two extremes:

- **In-memory only** — instant, but any crash or reload loses everything.
- **Server round-trip on every keystroke** — durable, but every action depends on the network.

Canvas-to-Code takes a third path: an **operation log with synchronous local commit and asynchronous everything else.**

Every user action — add a component, move a shape, edit a property, run an AI prompt — becomes an **immutable operation** that is:

1. Applied to in-memory state **in the same JavaScript tick** (instant feedback)
2. Appended to a durable journal
3. Flushed to IndexedDB on the next animation frame (~16ms)
4. Broadcast to other tabs via `BroadcastChannel`
5. Queued for remote sync with exponential backoff

The user sees **the same latency as a purely in-memory app.** They get **the durability of a networked one.** And they get **it without any paid API, cloud service, or API key.**

This is the entire thesis of the project. The rest is demonstration.

---

## Features

### Visual Layout Editor

- 🎨 **Drag-and-drop canvas** — containers, headings, paragraphs, buttons, images, inputs, dividers
- ⚡ **Live code generation** — HTML + Tailwind appears in the same frame as the edit
- 🌲 **Nested layouts** — select a container, add children, arrange freely
- 🌗 **Light and premium-black dark themes** — system-aware

### Diagram Editor

- 📐 **Flowcharts** — start/end terminators, process boxes, decision diamonds, I/O parallelograms, labeled arrows
- 🏛️ **UML class diagrams** — three-compartment class boxes, inheritance/association/composition arrows
- 💬 **Sequence diagrams** — actors, lifelines, call/return messages
- 📤 **Mermaid and PlantUML export** — copy a diagram as industry-standard text and paste into any renderer (GitHub, Notion, mermaid.live)

### Resilience

- 💾 **Crash-safe persistence** — every mutation written to IndexedDB before the next paint
- 🔌 **Offline-first** — keep editing when the network drops; auto-sync on reconnect
- 🔁 **Cross-tab sync** — `BroadcastChannel` keeps multiple tabs consistent in real time
- 🧬 **Vector-clock reconciliation** — concurrent edits from different sessions merge deterministically
- 🎯 **Recovery toast** — "Session restored · N changes replayed" on boot

### AI (No API Keys)

- ✨ **Generate layout from prompt** — describe a layout, get real components
- 🔀 **Generate diagrams from prompt** — "a login flowchart", "a sequence diagram", "a UML class diagram"
- 📝 **Describe current layout** — deterministic analysis of what's on the canvas
- 🚫 **Zero external calls** — everything runs locally in a Next.js route

### Development

- 🧪 **Deterministic replay** — same ops, same tree, always
- 📦 **Deploy to Vercel in 60 seconds** — no config, no env vars, no database
- 🚫 **No paid APIs, no API keys, no vendor lock-in**

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     UI (React / Zustand)                     │
│  User action → dispatch(op) → applyOp() → render (same tick) │
└───────────────────────────┬──────────────────────────────────┘
                            │ fire-and-forget (never awaited)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Commit Pipeline (non-blocking)                  │
│                                                              │
│   ┌────────────┐   ┌─────────────┐   ┌────────────────────┐  │
│   │  In-Mem    │──▶│ Write-Ahead │──▶│ BroadcastChannel   │  │
│   │  Journal   │   │ Queue       │   │ (cross-tab sync)   │  │
│   └────────────┘   └─────┬───────┘   └────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│                   ┌─────────────┐    ┌──────────────────┐    │
│                   │ IndexedDB   │    │ Remote Outbox    │    │
│                   │ (durable)   │    │ (retry/backoff)  │    │
│                   └─────────────┘    └──────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Recovery & Reconciliation                       │
│  • Boot: load root ID → replay local op-log                  │
│  • Reconnect: drain outbox → pull remote → merge             │
│  • Divergence: vector clocks → deterministic total order     │
└──────────────────────────────────────────────────────────────┘
```

### Design principles

1. **Single source of truth = an append-only op-log.** The layout tree, the generated code, and the diagram exports all derive from the same replayed state. Divergence is structurally impossible.
2. **Persist locally first, sync second.** IndexedDB writes happen on the frame after a mutation. Network is a replication concern, never a durability concern.
3. **Optimistic local, reconciled remote.** Edits apply instantly. Vector clocks and a deterministic tie-break ensure multi-client merges converge without data loss.
4. **Zero blocking I/O on the hot path.** The commit path is a pure reducer plus a Zustand `set()`. Persistence, broadcast, and remote sync are queued and fired after the frame.

### Failure modes handled

| Failure | Mechanism |
|---|---|
| Network disconnection | Outbox queues ops; exponential backoff (500ms → 30s); auto-flush on reconnect |
| Tab crash / battery death | IndexedDB write-ahead log; full replay on boot |
| Multiple tabs on one machine | `BroadcastChannel` + op-ID deduplication |
| Concurrent edits from different clients | Vector clocks + deterministic topological sort |
| IndexedDB unavailable | `localStorage` ring-buffer fallback |
| Log growth | Snapshot compaction every 60s (keeps last 500 ops) |
| Stale root reference after reload | Persistent root ID in IndexedDB + `localStorage` |

---

## AI Without APIs

Most "AI features" in demos require an API key, a credit card, and a network round-trip. This project demonstrates a different approach.

### The architectural insight

**An AI feature is just another writer to the operation log.**

When the user clicks **Generate layout from prompt**, the flow is:

```
Prompt → /api/ai/generate → rule-based recipe → list of ADD_NODE ops
      → store.applyAILayout(ops)
      → for each op: commit(op) ← the SAME pipeline as user input
      → journal + IndexedDB + BroadcastChannel + outbox
```

The AI output **inherits every resilience guarantee for free**: it's durable, recoverable, syncable, and undoable — because it flows through exactly the same `commit()` function that user clicks do. There is no special AI code path, no separate state, no separate recovery logic.

This is the single most important architectural observation in the project.

### What "AI" means here

The route uses **rule-based natural-language matching** against a library of layout and diagram recipes. It's not a large language model. It's a deterministic intent parser that:

- Recognizes **7 UI layouts**: login form, pricing page, product card, blog post, hero section, contact form, newsletter signup
- Recognizes **3 diagram types**: flowchart, UML class diagram, sequence diagram
- Falls back gracefully to a generic starting layout for unmatched prompts
- Never fails, never times out, never costs money

The point is not to compete with GPT-4. The point is to demonstrate that **AI-generated content and human-generated content can share one state machine** — and that once they do, all resilience properties apply uniformly.

Swapping the rule-based engine for a real LLM is a two-line change: replace the `pickRecipe()` function with a fetch to any model, keep the exact same ops output shape, and the entire pipeline works unchanged.

---

## Verification

Every claim in this README is verifiable in the browser. Run these tests to see the resilience architecture prove itself.

### 1. Offline editing

1. Open the app. Go to DevTools → **Network** → set throttling to **Offline**
2. Add components or diagram shapes — the UI keeps working
3. Toolbar badge turns amber: **Offline · N queued**
4. Amber banner slides in below the toolbar
5. Palette footer shows **N unsynced** with a **Retry** button
6. Set throttling back to **No throttling**
7. Badge flashes **Syncing · N**, then settles to **Synced** (green)

### 2. Crash recovery

1. Add several components or diagram elements
2. Note the hash in the bottom-right of the code panel (e.g. `-melvki`)
3. Hard refresh with **Ctrl + Shift + R**
4. Toast appears bottom-right: *"Session restored · N changes replayed"*
5. All elements are back; the hash is unchanged

### 3. Cross-tab sync

1. Open the app in two browser tabs
2. Add a component in tab A
3. It appears in tab B within a frame — no reload needed

### 4. Divergent merge

1. Tab A → go offline → add components
2. Tab B → stay online → add different components
3. Tab A → go online
4. Both tabs converge to the same merged layout; no edits are lost

### 5. Diagram export

1. Switch to **Diagram** mode in the toolbar
2. Add flowchart shapes, or click **AI Layout** and type "a flowchart"
3. Switch the code panel to the **Mermaid** tab
4. Copy the output, paste into [mermaid.live](https://mermaid.live) — it renders

### 6. AI-generated layouts

1. Click **AI Layout**
2. Type "a pricing page with three tiers" — three tier cards appear
3. Type "a login form" — email + password + submit appear
4. Type "a sequence diagram" — actors and messages appear
5. Every generated element is durable: refresh the page, and it's still there

---

## Deploy

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rohitsawant/canvas-to-code)

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js and deploys in about a minute. **No environment variables. No API keys. No database.**

### Fully static (no backend)

If you want zero server dependency — for GitHub Pages, for example — delete the two API routes and export as static:

```bash
rm -rf app/api/ping app/api/sync app/api/ai
```

Then in `next.config.js`:

```js
module.exports = {
  output: "export",
};
```

The app still:

- ✅ Persists to IndexedDB
- ✅ Recovers from crashes
- ✅ Syncs across tabs on the same machine
- ✅ Works completely offline
- ✅ Generates layouts and diagrams (AI routes run client-side via a built-in fallback)

You lose cross-device sync only. Everything else is browser-native.

---

## Project Structure

```
canvas-to-code/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── describe/route.ts     # Deterministic layout describer
│   │   │   └── generate/route.ts     # Rule-based layout & diagram generator
│   │   ├── ping/route.ts             # Heartbeat endpoint
│   │   └── sync/route.ts             # Op-log sync endpoint
│   ├── layout.tsx
│   ├── page.tsx                      # Shell-first render with skeletons
│   └── globals.css
├── components/
│   ├── AIComposer.tsx                # Modal for prompt-driven generation
│   ├── Canvas.tsx                    # Drag-and-drop layout editor
│   ├── CodePanel.tsx                 # HTML / Mermaid / PlantUML output
│   ├── ComponentPalette.tsx          # UI element sidebar
│   ├── DiagramCanvas.tsx             # SVG canvas for flowchart / UML / sequence
│   ├── DiagramPalette.tsx            # Diagram element sidebar
│   ├── ModeSwitcher.tsx              # UI ↔ Diagram toggle
│   ├── OfflineBanner.tsx             # Dismissible offline notice
│   ├── RecoveryToast.tsx             # "Session restored" notification
│   ├── SyncStatus.tsx                # Online / offline / syncing badge
│   ├── ThemeProvider.tsx
│   ├── ThemeToggle.tsx
│   └── Toolbar.tsx
├── lib/
│   ├── aiClient.ts                   # Fetch wrappers for AI routes
│   ├── compiler.ts                   # Layout tree → HTML + Tailwind
│   ├── connection.ts                 # Heartbeat + online/offline monitor
│   ├── diagramCompiler.ts            # Diagram tree → Mermaid / PlantUML
│   ├── diagramRenderer.ts            # Diagram tree → SVG layout primitives
│   ├── journal.ts                    # In-memory ring buffer
│   ├── oplog.ts                      # Pure reducer: applyOp, replayOps
│   ├── outbox.ts                     # Retry queue for remote sync
│   ├── persistence.ts                # IndexedDB wrapper + flush scheduler
│   ├── store.ts                      # Zustand store + commit pipeline
│   ├── sync.ts                       # BroadcastChannel + remote pull
│   ├── types.ts                      # Shared types
│   └── vclock.ts                     # Vector clocks + topological sort
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TypeScript 5 |
| State | Zustand |
| Styling | Tailwind CSS 3 |
| Persistence | IndexedDB + localStorage (browser-native) |
| Cross-tab sync | BroadcastChannel |
| Remote sync | Next.js API routes (serverless on Vercel) |
| Diagram rendering | Hand-rolled SVG |
| Diagram export | Mermaid + PlantUML (string generation) |
| AI | Rule-based intent parser (zero external calls) |
| IDs | nanoid |
| Icons | lucide-react |

**No paid services. No API keys. No analytics. No tracking.**

---

## Why This Matters Beyond the Demo

This isn't a toy. It's a pattern.

The resilience architecture — **op-log + local-first write-ahead + vector-clock merge** — is directly transferable to:

- **Collaborative document editors** (Notion, Linear, Coda all use variants)
- **Design tools** (Figma's multiplayer model is a close cousin)
- **Code editors** (VS Code's extension host uses an op-log-like protocol)
- **Note-taking apps** (Obsidian, Roam, Logseq all struggle with sync — this pattern solves it)
- **Any app that has users and offline moments** (which is all apps)

The demonstration is small. The lesson is general: **if you build the state layer correctly, resilience is a property you get for free — not a feature you bolt on.**

## Who This Is For

- **Developers building UI prototypes** who want real Tailwind HTML output, not screenshots
- **Engineers designing collaborative tools** who need a reference implementation of local-first sync
- **Teams evaluating local-first vs server-first** who want to see the tradeoffs in a working prototype
- **Anyone who has lost work to a crashed editor** and wants to see the alternative

**Why not Figma or Framer?** Because this outputs **raw HTML + Tailwind you can paste into your codebase**, not a proprietary format. Because it exports **Mermaid and PlantUML** for diagrams. Because the entire thing runs **without a backend** if you want it to. And because the resilience architecture is the deliverable — every creative tool should be crash-safe by default.

---

## License

MIT © Rohit Sawant

---

<div align="center">

**Built as a demonstration of resilient local-first state tracking — for layouts, diagrams, and AI-generated content alike.**

If you find a failure mode this doesn't handle, open an issue.

</div>
