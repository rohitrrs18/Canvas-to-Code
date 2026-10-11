import { nanoid } from "nanoid";
import type { LayoutState, LayoutNode, Op, ComponentType } from "./types";

export const CURRENT_VERSION = 1;

export function applyOp(state: LayoutState, op: Op): LayoutState {
  switch (op.type) {
    case "ADD_NODE": {
      const node: LayoutNode = op.payload.node;
      const parentId: string = op.payload.parentId ?? state.rootId;
      const parent = state.nodes[parentId];

      // Edges can attach to ROOT without a real parent.
      const isEdge =
        node.type === "flow-edge" ||
        node.type === "uml-edge" ||
        node.type === "seq-message";

      if (!parent && !isEdge) return state;

      const newNodes = { ...state.nodes, [node.id]: node };
      if (parent) {
        newNodes[parentId] = {
          ...parent,
          children: [...parent.children, node.id],
        };
      }

      return { ...state, nodes: newNodes, selectedId: node.id };
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

      for (const [id, n] of Object.entries(state.nodes)) {
        const isEdge =
          n.type === "flow-edge" ||
          n.type === "uml-edge" ||
          n.type === "seq-message";
        if (isEdge && (n.from === nodeId || n.to === nodeId)) {
          toRemove.add(id);
        }
      }

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
      const { nodeId, newParentId, newOrder, x, y } = op.payload;
      const node = state.nodes[nodeId];
      if (!node || nodeId === state.rootId) return state;

      // Absolute (x, y) move for diagram shapes.
      if (x !== undefined || y !== undefined) {
        return {
          ...state,
          nodes: {
            ...state.nodes,
            [nodeId]: { ...node, x: x ?? node.x, y: y ?? node.y },
          },
        };
      }

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

      newNodes[nodeId] = { ...node, parentId: newParentId, order: newOrder };
      return { ...state, nodes: newNodes };
    }

    case "UPDATE_PROPS": {
      const { nodeId, props } = op.payload;
      const node = state.nodes[nodeId];
      if (!node) return state;

      const updated: LayoutNode = {
        ...node,
        props: { ...node.props, ...props },
      };
      if (props.from !== undefined) updated.from = props.from;
      if (props.to !== undefined) updated.to = props.to;

      return {
        ...state,
        nodes: { ...state.nodes, [nodeId]: updated },
      };
    }

    case "SET_MODE":
      return { ...state };

    case "RESET":
      return op.payload.state;

    default:
      return state;
  }
}

export function replayOps(initialState: LayoutState, ops: Op[]): LayoutState {
  return ops.reduce((state, op) => applyOp(state, op), initialState);
}

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

export function isDiagramType(type: ComponentType): boolean {
  return (
    type === "flow-node" ||
    type === "flow-edge" ||
    type === "uml-class" ||
    type === "uml-edge" ||
    type === "seq-actor" ||
    type === "seq-message"
  );
}

export function isEdgeType(type: ComponentType): boolean {
  return (
    type === "flow-edge" ||
    type === "uml-edge" ||
    type === "seq-message"
  );
}