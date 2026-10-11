import { nanoid } from "nanoid";
import type { LayoutState, LayoutNode, Op } from "./types";

export const CURRENT_VERSION = 1;

/**
 * Applies a single operation to the layout state.
 * Pure function — same input always yields same output.
 * This is the ONLY place state is mutated.
 */
export function applyOp(state: LayoutState, op: Op): LayoutState {
  switch (op.type) {
    case "ADD_NODE": {
      const node: LayoutNode = op.payload.node;
      const parentId: string = op.payload.parentId ?? state.rootId;

      const parent = state.nodes[parentId];
      if (!parent) return state;

      const newParent: LayoutNode = {
        ...parent,
        children: [...parent.children, node.id],
      };

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [node.id]: node,
          [parentId]: newParent,
        },
        selectedId: node.id,
      };
    }

    case "REMOVE_NODE": {
      const nodeId: string = op.payload.nodeId;
      const node = state.nodes[nodeId];
      if (!node || nodeId === state.rootId) return state;

      const toRemove = new Set<string>();
      const collect = (id: string) => {
        toRemove.add(id);
        state.nodes[id]?.children.forEach(collect);
      };
      collect(nodeId);

      const newNodes = { ...state.nodes };
      toRemove.forEach((id) => delete newNodes[id]);

      const parent = newNodes[node.parentId!];
      if (parent) {
        newNodes[parent.id] = {
          ...parent,
          children: parent.children.filter((c) => c !== nodeId),
        };
      }

      return {
        ...state,
        nodes: newNodes,
        selectedId: state.selectedId === nodeId ? null : state.selectedId,
      };
    }

    case "MOVE_NODE": {
      const { nodeId, newParentId, newOrder } = op.payload;
      const node = state.nodes[nodeId];
      if (!node || nodeId === state.rootId) return state;

      const oldParent = state.nodes[node.parentId!];
      const newParent = state.nodes[newParentId];
      if (!oldParent || !newParent) return state;

      let cur = newParent;
      while (cur) {
        if (cur.id === nodeId) return state;
        cur = cur.parentId ? state.nodes[cur.parentId] : (null as any);
      }

      const newNodes = { ...state.nodes };

      newNodes[oldParent.id] = {
        ...oldParent,
        children: oldParent.children.filter((c) => c !== nodeId),
      };

      const updatedChildren = [...newNodes[newParent.id].children];
      updatedChildren.splice(newOrder, 0, nodeId);
      newNodes[newParent.id] = {
        ...newNodes[newParent.id],
        children: updatedChildren,
      };

      newNodes[nodeId] = {
        ...node,
        parentId: newParentId,
        order: newOrder,
      };

      return { ...state, nodes: newNodes };
    }

    case "UPDATE_PROPS": {
      const { nodeId, props } = op.payload;
      const node = state.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...node,
            props: { ...node.props, ...props },
          },
        },
      };
    }

    case "RESET": {
      return op.payload.state;
    }

    default:
      return state;
  }
}

export function replayOps(
  initialState: LayoutState,
  ops: Op[]
): LayoutState {
  return ops.reduce((state, op) => applyOp(state, op), initialState);
}

/**
 * Creates a fresh layout state. If `rootId` is provided, the root node
 * reuses that ID so that ops referencing it from a previous session
 * can be replayed successfully. If omitted, a new ID is generated.
 */
export function createInitialState(rootId?: string): LayoutState {
  const id = rootId ?? nanoid();
  return {
    rootId: id,
    selectedId: null,
    nodes: {
      [id]: {
        id,
        type: "container",
        parentId: null,
        order: 0,
        props: { className: "flex flex-col gap-4 p-8 min-h-full" },
        children: [],
      },
    },
  };
}