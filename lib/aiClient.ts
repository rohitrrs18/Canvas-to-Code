import type { Op } from "./types";

export interface AIGenerateResponse {
  ops: Omit<Op, "id" | "timestamp" | "clientId" | "vclock">[];
  engine?: string;
}

export async function generateLayout(
  prompt: string,
  currentTree: unknown
): Promise<AIGenerateResponse> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, currentTree }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Generate failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function describeLayout(
  currentTree: unknown
): Promise<{ description: string; engine?: string }> {
  const res = await fetch("/api/ai/describe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentTree }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Describe failed: ${res.status} ${text}`);
  }
  return res.json();
}