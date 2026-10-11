import type { LayoutNode, LayoutState } from "./types";

/**
 * Derives HTML + Tailwind from the layout tree.
 * Single source of truth — no separate state for the compiler.
 */
export function compileToHTML(state: LayoutState): string {
  const root = state.nodes[state.rootId];
  if (!root) return "";
  return renderNode(root, state, 0);
}

function renderNode(node: LayoutNode, state: LayoutState, depth: number): string {
  const indent = "  ".repeat(depth);
  const cls = node.props.className ? ` class="${node.props.className}"` : "";

  switch (node.type) {
    case "container": {
      const children = node.children
        .map((id) => state.nodes[id])
        .filter(Boolean)
        .map((c) => renderNode(c, state, depth + 1))
        .join("\n");
      return `${indent}<div${cls}>\n${children}\n${indent}</div>`;
    }
    case "heading": {
      const text = node.props.text ?? "Heading";
      return `${indent}<h2${cls}>${escapeHtml(text)}</h2>`;
    }
    case "paragraph": {
      const text = node.props.text ?? "Paragraph text";
      return `${indent}<p${cls}>${escapeHtml(text)}</p>`;
    }
    case "button": {
      const text = node.props.text ?? "Click me";
      return `${indent}<button${cls}>${escapeHtml(text)}</button>`;
    }
    case "image": {
      const src = node.props.src ?? "https://placehold.co/400x300";
      const alt = node.props.alt ?? "Image";
      return `${indent}<img src="${src}" alt="${alt}"${cls} />`;
    }
    case "input": {
      const placeholder = node.props.placeholder ?? "Enter text...";
      return `${indent}<input type="text" placeholder="${placeholder}"${cls} />`;
    }
    case "divider": {
      return `${indent}<hr${cls} />`;
    }
    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Hash used for divergence detection between layout and compiler.
 */
export function hashLayout(state: LayoutState): string {
  const json = JSON.stringify(state.nodes);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) - hash + json.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}