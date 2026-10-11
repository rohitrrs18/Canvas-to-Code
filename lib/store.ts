import { create } from "zustand";
import { nanoid } from "nanoid";
import type { LayoutNode, LayoutState, Op, ComponentType, VectorClock } from "./types";
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

  hydrate: () => Promise<void>;
  addNode: (type: ComponentType, parentId?: string) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, newOrder: number) => void;
  updateProps: (id: string, props: Record<string, string>) => void;
  selectNode: (id: string | null) => void;
  reset: () => void;
  clearStorage: () => Promise<void>;
  _mergeExternal: (ops: Op[]) => void;
}

function derive(state: LayoutState) {
  return { code: compileToHTML(state), layoutHash: hashLayout(state) };
}

/** Module-scope timer handle so clearStorage() can stop compaction. */
let compactionTimer: ReturnType<typeof setInterval> | null = null;

/** The client ID, resolved once at module load. */
const CLIENT_ID = getClientId();

export const useStore = create<Store>((set, get) => ({
  // Placeholder initial — replaced during hydrate() with the stable root.
  state: createInitialState(),
  ops: [],
  vclock: {},
  clientId: CLIENT_ID,
  hydrated: false,
  lastSavedAt: null,
  connection: "online",
  pendingOps: 0,
  ...derive(createInitialState()),

  hydrate: async () => {
    // 1. Load or generate the persistent root ID.
    const persistedRootId = await loadRootId();
    const rootId = persistedRootId ?? nanoid();
    if (!persistedRootId) await saveRootId(rootId);

    // 2. Build a fresh initial state with the STABLE root ID.
    const stableInitial = createInitialState(rootId);

    // 3. Replay persisted ops against it.
    const persisted = await loadPersistedOps();
    const ordered = topoSort(persisted);
    const state = ordered.length > 0
      ? replayOps(stableInitial, ordered)
      : stableInitial;

    let vclock: VectorClock = {};
    for (const op of ordered) vclock = mergeClock(vclock, op.vclock);

    journal.reset(ordered);
    set({
      state,
      ops: ordered,
      vclock,
      hydrated: true,
      lastSavedAt: Date.now(),
      pendingOps: journal.pending().length,
      ...derive(state),
    });

    // 4. Notify the recovery toast.
    if (ordered.length > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("session-restored", {
          detail: { opCount: ordered.length },
        })
      );
    }

    // 5. Start subsystems.
    connection.start();
    outbox.start();

    connection.onChange((status) => {
      set({ connection: status });
      if (status === "online") void pullAndMerge(get);
    });

    syncBus.start(get().clientId, (merged) => {
      get()._mergeExternal(merged);
    });

    // 6. Subscribe to outbox flush completions.
    if (typeof window !== "undefined") {
      window.addEventListener("ops-synced", ((e: CustomEvent) => {
        const detail = e.detail as { pendingOps: number };
        useStore.setState({ pendingOps: detail.pendingOps });
      }) as EventListener);
    }

    // 7. Pull remote ops if we're online.
    if (connection.get() === "online") void pullAndMerge(get);

    // 8. Periodic compaction.
    if (compactionTimer) clearInterval(compactionTimer);
    compactionTimer = setInterval(() => {
      void compactLog(500);
    }, 60_000);
  },

  addNode: (type, parentId) => {
    const target = parentId ?? get().state.rootId;
    const node = createNode(type, target);
    commit("ADD_NODE", { node, parentId: target }, set, get);
  },

  removeNode: (id) => commit("REMOVE_NODE", { nodeId: id }, set, get),

  moveNode: (id, newParentId, newOrder) =>
    commit("MOVE_NODE", { nodeId: id, newParentId, newOrder }, set, get),

  updateProps: (id, props) =>
    commit("UPDATE_PROPS", { nodeId: id, props }, set, get),

  selectNode: (id) => set((s) => ({ state: { ...s.state, selectedId: id } })),

  reset: () => {
    // Reset generates a NEW root ID and persists it, so future ops
    // reference the new tree.
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
      ...derive(fresh),
      lastSavedAt: null,
      pendingOps: 0,
    });
  },

  _mergeExternal: (ops) => {
    // Reuse the CURRENT root ID — the ops we're merging were created
    // against a tree whose root is already in state.
    const currentRootId = get().state.rootId;
    const stableInitial = createInitialState(currentRootId);
    const state = replayOps(stableInitial, ops);
    let vclock: VectorClock = {};
    for (const op of ops) vclock = mergeClock(vclock, op.vclock);
    set({
      state,
      ops,
      vclock,
      pendingOps: journal.pending().length,
      ...derive(state),
    });
  },
}));

/**
 * The single commit path.
 */
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

/**
 * Pull remote ops and merge them with the local journal.
 */
async function pullAndMerge(get: () => Store): Promise<void> {
  try {
    await outbox.drain();
  } catch { /* best-effort */ }

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
      return {
        ...base,
        props: { text: "New Heading", className: "text-2xl font-semibold" },
      };
    case "paragraph":
      return {
        ...base,
        props: {
          text: "Some descriptive text.",
          className: "text-base opacity-80",
        },
      };
    case "button":
      return {
        ...base,
        props: {
          text: "Click me",
          className:
            "px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition",
        },
      };
    case "image":
      return {
        ...base,
        props: {
          src: "https://placehold.co/400x300",
          alt: "Placeholder",
          className: "rounded-lg w-full",
        },
      };
    case "input":
      return {
        ...base,
        props: {
          placeholder: "Enter text...",
          className:
            "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
        },
      };
    case "divider":
      return {
        ...base,
        props: {
          className: "border-t border-slate-300 dark:border-slate-700 my-2",
        },
      };
    default:
      return base;
  }
}