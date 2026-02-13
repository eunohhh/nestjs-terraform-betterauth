import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const ADMIN_KEY = process.env.GRAPHQL_ADMIN_KEY;

export async function POST(req: Request) {
  try {
    if (!ADMIN_KEY) {
      return NextResponse.json({ error: 'GRAPHQL_ADMIN_KEY is not set' }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    const limit = typeof body.limit === 'number' ? body.limit : 200;

    const upstream = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
      },
      body: JSON.stringify({
        query: `mutation ($limit: Int!) { ingestHistorian(limit: $limit) { ok mode nodes edges } }`,
        variables: { limit },
      }),
      // avoid caching
      cache: 'no-store',
    });

    const json = (await upstream.json().catch(() => null)) as any;

    if (!upstream.ok || json?.errors) {
      const message = json?.errors?.[0]?.message ?? `Upstream error (${upstream.status})`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json(json.data.ingestHistorian);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
