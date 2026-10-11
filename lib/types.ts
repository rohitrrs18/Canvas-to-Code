export type ComponentType =
  | "container" | "heading" | "paragraph" | "button"
  | "image" | "input" | "divider";

export interface LayoutNode {
  id: string;
  type: ComponentType;
  props: Record<string, string>;
  children: string[];
  parentId: string | null;
  order: number;
}

export type OpType =
  | "ADD_NODE" | "REMOVE_NODE" | "MOVE_NODE"
  | "UPDATE_PROPS" | "RESET";

/** Vector clock: clientId → monotonic counter. */
export type VectorClock = Record<string, number>;

export interface Op {
  id: string;
  type: OpType;
  timestamp: number;
  clientId: string;
  /** Vector clock at time of creation. */
  vclock: VectorClock;
  payload: any;
  /** Op this one was created against — for causal replay. */
  deps?: string[];
}

export interface LayoutState {
  nodes: Record<string, LayoutNode>;
  rootId: string;
  selectedId: string | null;
}

export interface JournalEntry {
  op: Op;
  /** 0 = not flushed, 1 = in IndexedDB, 2 = synced to remote. */
  durability: 0 | 1 | 2;
}

export interface PersistedState {
  version: number;
  ops: Op[];
  clientId: string;
  lastSyncedAt: number;
}