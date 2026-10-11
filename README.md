<div align="center">

# Canvas-to-Code

**A crash-safe, offline-first visual prototyping board that compiles drag-and-drop layouts into clean Tailwind HTML in real time.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Resilience Tests](#testing-the-resilience) · [Deploy](#deploy)

</div>

---

## Overview

Canvas-to-Code is a visual editor for building HTML layouts with Tailwind CSS. Drag components onto a canvas, nest them, and watch the generated code update in the same frame.

What makes it different: **the editor never loses your work.** Every user action is captured as an immutable operation, durably persisted to IndexedDB within one animation frame, and replayed on reload. If the network drops, the tab crashes, or the machine loses power mid-drag — the layout is exactly where you left it.

**The core promise:** instant feedback, zero data loss, seamless recovery.

---

## Features

- 🎨 **Visual drag-and-drop editor** — container, heading, paragraph, button, image, input, divider
- ⚡ **Live HTML + Tailwind compilation** — code panel updates in the same frame as the edit
- 💾 **Crash-safe persistence** — every mutation written to IndexedDB before the next paint
- 🔌 **Offline-first** — keep editing when the network dies; auto-syncs on reconnect
- 🔁 **Cross-tab sync** — BroadcastChannel keeps multiple tabs consistent in real time
- 🧬 **Vector-clock reconciliation** — concurrent edits from different sessions merge deterministically
- 🌗 **Light and dark themes** — system-aware with a premium black dark mode
- 🚫 **Zero paid APIs, zero API keys, zero vendor lock-in** — the whole thing runs on browser primitives and two trivial Next.js routes
- 📦 **Deploy to Vercel in 60 seconds** — no config, no env vars

---

## The Resilience Problem

Most "live" editors assume a healthy session. In reality:

| Failure | Consequence in a naive design |
|---|---|
| Laptop battery dies mid-drag | Last few seconds of work lost |
| Network connection drops | Editor freezes or refuses further edits |
| Browser tab crashes | Entire in-memory state gone |
| User edits in two tabs | Last-write-wins overwrites the other tab |

Canvas-to-Code is built on an **operation-log architecture** where every user action is an immutable, ordered event. Replay is deterministic. Merge is idempotent. Recovery is structural.

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
│  • Boot: load root ID → replay local log                     │
│  • Reconnect: drain outbox → pull remote → merge             │
│  • Divergence: vector clocks → deterministic total order     │
└──────────────────────────────────────────────────────────────┘
```

### Design principles

1. **Single source of truth = an append-only op-log.** The layout tree and the generated code both derive from the same replayed state. Divergence is structurally impossible.
2. **Persist locally first, sync second.** IndexedDB writes happen on the frame after a mutation. Network is a replication concern, never a durability concern.
3. **Optimistic local, reconciled remote.** Edits apply instantly. Vector clocks and a deterministic tie-break ensure multi-client merges converge without data loss.
4. **Zero blocking I/O on the hot path.** The commit path is a pure reducer plus a Zustand `set()`. Persistence, broadcast, and remote sync are queued and fired after the frame.

### Failure modes handled

| Failure | Mechanism |
|---|---|
| Network disconnection | Outbox queues ops; exponential backoff (500 ms → 30 s); auto-flush on reconnect |
| Tab crash / battery death | IndexedDB write-ahead log; full replay on boot |
| Multiple tabs on one machine | BroadcastChannel + op-ID deduplication |
| Concurrent edits from different clients | Vector clocks + deterministic topological sort |
| IndexedDB unavailable | localStorage ring-buffer fallback |
| Log growth | Snapshot compaction every 60 s (keeps last 500 ops) |
| Stale root reference after reload | Persistent root ID in IndexedDB + localStorage |

---

## Getting Started

```bash
git clone https://github.com/<your-username>/canvas-to-code.git
cd canvas-to-code
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**No environment variables. No API keys. No external services.**

---

## Testing the Resilience

Every claim in this README is verifiable in the browser. Run these four tests to see the system recover from real failures.

### 1. Offline editing

1. Open DevTools → **Network** → set throttling to **Offline**
2. Add components — the UI keeps working
3. Toolbar badge turns amber: **Offline · N queued**
4. Amber banner slides in below the toolbar
5. Palette footer shows **N unsynced** with a **Retry** button
6. Set throttling back to **No throttling**
7. Badge flashes **Syncing · N**, then settles to **Synced** (green)

### 2. Crash recovery

1. Add several components
2. Note the hash in the bottom-right of the code panel (e.g. `-melvki`)
3. Hard refresh with **Ctrl + Shift + R**
4. Toast appears bottom-right: *"Session restored · N changes replayed"*
5. All components are back; the hash is unchanged

### 3. Cross-tab sync

1. Open the app in two browser tabs
2. Add a component in tab A
3. It appears in tab B within a frame — no reload needed

### 4. Divergent merge

1. Tab A → go offline → add components
2. Tab B → stay online → add different components
3. Tab A → go online
4. Both tabs converge to the same merged layout; no edits are lost

---

## Deploy

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/<your-username>/canvas-to-code)

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js and deploys in about a minute. No configuration required.

### Fully static (no backend)

If you want zero server dependency — for a GitHub Pages deployment, for example — delete the two API routes and export as static:

```bash
rm -rf app/api/ping app/api/sync
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

You lose cross-device sync only. Everything else is browser-native.

---

## Project Structure

```
canvas-to-code/
├── app/
│   ├── api/
│   │   ├── ping/route.ts      # HEAD heartbeat endpoint
│   │   └── sync/route.ts      # Op-log POST + GET sync endpoint
│   ├── layout.tsx
│   ├── page.tsx               # Shell-first render with skeletons
│   └── globals.css
├── components/
│   ├── Canvas.tsx             # Drag-and-drop layout editor
│   ├── CodePanel.tsx          # Live HTML + Tailwind output
│   ├── ComponentPalette.tsx   # Left sidebar with node types
│   ├── Toolbar.tsx            # Top bar with actions
│   ├── SyncStatus.tsx         # Online / offline / syncing badge
│   ├── OfflineBanner.tsx      # Dismissible offline notice
│   ├── RecoveryToast.tsx      # "Session restored" notification
│   ├── ThemeToggle.tsx
│   └── ThemeProvider.tsx
├── lib/
│   ├── oplog.ts               # Pure reducer: applyOp, replayOps
│   ├── store.ts               # Zustand store + commit pipeline
│   ├── persistence.ts         # IndexedDB wrapper + flush scheduler
│   ├── journal.ts             # In-memory ring buffer
│   ├── outbox.ts              # Retry queue for remote sync
│   ├── connection.ts          # Heartbeat + online/offline monitor
│   ├── sync.ts                # BroadcastChannel + remote pull
│   ├── vclock.ts              # Vector clocks + topological sort
│   ├── compiler.ts            # Layout → HTML + Tailwind
│   └── types.ts               # Shared types
├── public/
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
| IDs | nanoid |
| Icons | lucide-react |

**No paid services. No API keys. No analytics. No tracking.**

---

## Why This Design

Most prototypes reach for one of two extremes:

- **In-memory only** — instant, but any crash or reload loses everything.
- **Server round-trip on every keystroke** — durable, but every action depends on the network.

Canvas-to-Code takes a third path: an **op-log with synchronous local commit and asynchronous everything else**. The user sees the same latency as a purely in-memory app, but the durability and sync properties of a networked one.

The cost is architectural complexity — a pure reducer, a journal, a flush scheduler, an outbox, vector clocks, and a reconciliation strategy. The payoff is that the editor cannot lose work, cannot desync from its own code output, and cannot be broken by the network.

This is what the codebase is really demonstrating.

---

## License

MIT © Rohit Sawant

---

<div align="center">

**Built as a demonstration of resilient local-first state tracking.**

If you find a failure mode this doesn't handle, open an issue.

</div>