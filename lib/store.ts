import { create } from "zustand";
import { nanoid } from "nanoid";
import type { LayoutNode, LayoutState, Op, ComponentType, VectorClock, EditorMode } from "./types";
import { applyOp, createInitialState, replayOps } from "./oplog";
import { journal } from "./journal";
import {
  flushScheduler,
  loadPersistedOps,
  saveMeta,
  clearAll,
  compactLog,
  loadRootId,
  saveRootId,
  clearRootId,
} from "./persistence";
import { connection } from "./connection";
import { outbox } from "./outbox";
import { syncBus, pullRemote } from "./sync";
import { topoSort, tick, merge as mergeClock } from "./vclock";
import { compileToHTML, hashLayout } from "./compiler";

const CLIENT_ID_KEY = "canvas-client-id";

function getClientId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = nanoid(8);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

interface Store {
  state: LayoutState;
  ops: Op[];
  vclock: VectorClock;
  clientId: string;
  hydrated: boolean;
  lastSavedAt: number | null;
  connection: "online" | "offline" | "reconnecting";
  pendingOps: number;
  code: string;
  layoutHash: string;
  mode: EditorMode;

  hydrate: () => Promise<void>;
  addNode: (type: ComponentType, parentId?: string, prebuilt?: LayoutNode) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, newOrder: number, x?: number, y?: number) => void;
  updateProps: (id: string, props: Record<string, any>) => void;
  selectNode: (id: string | null) => void;
  reset: () => void;
  clearStorage: () => Promise<void>;
  setMode: (mode: EditorMode) => void;
  applyAILayout: (ops: any[]) => void;
  _mergeExternal: (ops: Op[]) => void;
}

function derive(state: LayoutState) {
  return { code: compileToHTML(state), layoutHash: hashLayout(state) };
}

let compactionTimer: ReturnType<typeof setInterval> | null = null;
const CLIENT_ID = getClientId();

export const useStore = create<Store>((set, get) => ({
  state: createInitialState(),
  ops: [],
  vclock: {},
  clientId: CLIENT_ID,
  hydrated: false,
  lastSavedAt: null,
  connection: "online",
  pendingOps: 0,
  mode: "ui",
  ...derive(createInitialState()),

  hydrate: async () => {
    const persistedRootId = await loadRootId();
    const rootId = persistedRootId ?? nanoid();
    if (!persistedRootId) await saveRootId(rootId);

    const stableInitial = createInitialState(rootId);
    const persisted = await loadPersistedOps();
    const ordered = topoSort(persisted);
    const state = ordered.length > 0
      ? replayOps(stableInitial, ordered)
      : stableInitial;

    let vclock: VectorClock = {};
    for (const op of ordered) vclock = mergeClock(vclock, op.vclock);

    // Infer mode from what's in the tree.
    const hasDiagram = Object.values(state.nodes).some(
      (n) =>
        n.type === "flow-node" ||
        n.type === "uml-class" ||
        n.type === "seq-actor"
    );
    const mode: EditorMode = hasDiagram ? "diagram" : "ui";

    journal.reset(ordered);
    set({
      state,
      ops: ordered,
      vclock,
      hydrated: true,
      lastSavedAt: Date.now(),
      pendingOps: journal.pending().length,
      mode,
      ...derive(state),
    });

    if (ordered.length > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("session-restored", {
          detail: { opCount: ordered.length },
        })
      );
    }

    connection.start();
    outbox.start();

    connection.onChange((status) => {
      set({ connection: status });
      if (status === "online") void pullAndMerge(get);
    });

    syncBus.start(get().clientId, (merged) => {
      get()._mergeExternal(merged);
    });

    if (typeof window !== "undefined") {
      window.addEventListener("ops-synced", ((e: CustomEvent) => {
        const detail = e.detail as { pendingOps: number };
        useStore.setState({ pendingOps: detail.pendingOps });
      }) as EventListener);
    }

    if (connection.get() === "online") void pullAndMerge(get);

    if (compactionTimer) clearInterval(compactionTimer);
    compactionTimer = setInterval(() => {
      void compactLog(500);
    }, 60_000);
  },

  addNode: (type, parentId, prebuilt) => {
    const target = parentId ?? get().state.rootId;
    const node = prebuilt ?? createNode(type, target);
    commit("ADD_NODE", { node, parentId: target }, set, get);
  },

  removeNode: (id) => commit("REMOVE_NODE", { nodeId: id }, set, get),

  moveNode: (id, newParentId, newOrder, x, y) =>
    commit("MOVE_NODE", { nodeId: id, newParentId, newOrder, x, y }, set, get),

  updateProps: (id, props) =>
    commit("UPDATE_PROPS", { nodeId: id, props }, set, get),

  selectNode: (id) => set((s) => ({ state: { ...s.state, selectedId: id } })),

  setMode: (mode) => set({ mode }),

  reset: () => {
    const fresh = createInitialState();
    commit("RESET", { state: fresh }, set, get);
    void saveRootId(fresh.rootId);
  },

  clearStorage: async () => {
    if (compactionTimer) {
      clearInterval(compactionTimer);
      compactionTimer = null;
    }
    await clearAll();
    await clearRootId();

    const fresh = createInitialState();
    await saveRootId(fresh.rootId);

    journal.reset([]);
    set({
      state: fresh,
      ops: [],
      vclock: {},
      mode: "ui",
      ...derive(fresh),
      lastSavedAt: null,
      pendingOps: 0,
    });
  },

  applyAILayout: (aiOps: any[]) => {
    for (const raw of aiOps) {
      const op: Op = {
        id: nanoid(),
        type: raw.type,
        timestamp: Date.now(),
        clientId: get().clientId,
        vclock: tick(get().vclock, get().clientId),
        payload: raw.payload,
      };
      commit(op.type, op.payload, set, get);
    }
  },

  _mergeExternal: (ops) => {
    const currentRootId = get().state.rootId;
    const stableInitial = createInitialState(currentRootId);
    const state = replayOps(stableInitial, ops);
    let vclock: VectorClock = {};
    for (const op of ops) vclock = mergeClock(vclock, op.vclock);

    const hasDiagram = Object.values(state.nodes).some(
      (n) =>
        n.type === "flow-node" ||
        n.type === "uml-class" ||
        n.type === "seq-actor"
    );
    const mode: EditorMode = hasDiagram ? "diagram" : "ui";

    set({
      state,
      ops,
      vclock,
      mode,
      pendingOps: journal.pending().length,
      ...derive(state),
    });
  },
}));

function commit(
  type: Op["type"],
  payload: any,
  set: any,
  get: () => Store
): void {
  const { state, vclock, clientId } = get();
  const op: Op = {
    id: nanoid(),
    type,
    timestamp: Date.now(),
    clientId,
    vclock: tick(vclock, clientId),
    payload,
  };

  const nextState = applyOp(state, op);
  journal.append(op);
  set({
    state: nextState,
    ops: [...get().ops, op],
    vclock: op.vclock,
    ...derive(nextState),
  });

  flushScheduler.enqueue(op);
  syncBus.broadcast(op);
  outbox.enqueue(op);

  useStore.setState({ pendingOps: journal.pending().length });

  saveMeta({
    version: 1,
    ops: [],
    clientId,
    lastSyncedAt: Date.now(),
  }).catch(() => {});
}

async function pullAndMerge(get: () => Store): Promise<void> {
  try { await outbox.drain(); } catch { /* best-effort */ }

  const ops = await pullRemote(get().clientId);
  if (ops.length === 0) {
    outbox.retryNow();
    return;
  }

  const existing = journal.all();
  const known = new Set(existing.map((o) => o.id));
  const fresh = ops.filter((o) => !known.has(o.id));

  if (fresh.length > 0) {
    const merged = topoSort([...existing, ...fresh]);
    journal.reset(merged);
    useStore.getState()._mergeExternal(merged);
  }

  outbox.retryNow();
}

function createNode(type: ComponentType, parentId: string): LayoutNode {
  const id = nanoid();
  const base: LayoutNode = {
    id,
    type,
    parentId,
    order: 0,
    children: [],
    props: {},
  };
  switch (type) {
    case "container":
      return { ...base, props: { className: "flex flex-col gap-3 p-4" } };
    case "heading":
      return { ...base, props: { text: "New Heading", className: "text-2xl font-semibold" } };
    case "paragraph":
      return { ...base, props: { text: "Some descriptive text.", className: "text-base opacity-80" } };
    case "button":
      return { ...base, props: { text: "Click me", className: "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition" } };
    case "image":
      return { ...base, props: { src: "https://placehold.co/400x300", alt: "Placeholder", className: "rounded-lg w-full" } };
    case "input":
      return { ...base, props: { placeholder: "Enter text...", className: "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" } };
    case "divider":
      return { ...base, props: { className: "border-t border-slate-300 dark:border-slate-700 my-2" } };
    default:
      return base;
  }
}