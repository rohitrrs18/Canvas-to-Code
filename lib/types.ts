export type UIComponentType =
  | "container" | "heading" | "paragraph" | "button"
  | "image" | "input" | "divider";

export type DiagramComponentType =
  | "flow-node"
  | "flow-edge"
  | "uml-class"
  | "uml-edge"
  | "seq-actor"
  | "seq-message";

export type ComponentType = UIComponentType | DiagramComponentType;

export type EditorMode = "ui" | "diagram";

export interface LayoutNode {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  children: string[];
  parentId: string | null;
  order: number;
  x?: number;
  y?: number;
  from?: string;
  to?: string;
}

export type OpType =
  | "ADD_NODE" | "REMOVE_NODE" | "MOVE_NODE"
  | "UPDATE_PROPS" | "RESET" | "SET_MODE";

export type VectorClock = Record<string, number>;

export interface Op {
  id: string;
  type: OpType;
  timestamp: number;
  clientId: string;
  vclock: VectorClock;
  payload: any;
  deps?: string[];
}

export interface LayoutState {
  nodes: Record<string, LayoutNode>;
  rootId: string;
  selectedId: string | null;
}

export interface JournalEntry {
  op: Op;
  durability: 0 | 1 | 2;
}

export interface PersistedState {
  version: number;
  ops: Op[];
  clientId: string;
  lastSyncedAt: number;
}