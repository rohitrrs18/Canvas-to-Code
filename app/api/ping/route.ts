export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response("pong", {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}