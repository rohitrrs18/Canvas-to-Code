import { NextRequest, NextResponse } from "next/server";
import type { Op } from "@/lib/types";

// In production, swap this for Vercel KV, Upstash Redis, or a Postgres table.
const opStore = new Map<string, Op[]>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { ops?: Op[] };
    const incoming = body.ops ?? [];

    let accepted = 0;
    let deduped = 0;

    for (const op of incoming) {
      const list = opStore.get(op.clientId) ?? [];
      if (list.some((o) => o.id === op.id)) {
        deduped++;
        continue;
      }
      list.push(op);
      opStore.set(op.clientId, list);
      accepted++;
    }

    return NextResponse.json(
      { ok: true, accepted, deduped, total: opStore.size },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("[api/sync] POST failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get("clientId") ?? "";

    if (clientId === "__debug__") {
      // Debug endpoint: return everything, useful for verifying the store.
      const all: Op[] = [];
      for (const ops of opStore.values()) all.push(...ops);
      return NextResponse.json({ ops: all, clients: opStore.size });
    }

    const all: Op[] = [];
    for (const [cid, ops] of opStore) {
      if (cid !== clientId) all.push(...ops);
    }
    return NextResponse.json(
      { ops: all },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("[api/sync] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}