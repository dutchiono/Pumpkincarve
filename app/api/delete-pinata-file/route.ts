import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cid } = body || {};

    if (!cid || typeof cid !== 'string') {
      return NextResponse.json({ error: 'cid is required' }, { status: 400 });
    }

    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      return NextResponse.json({ error: 'PINATA_JWT not configured' }, { status: 500 });
    }

    const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${encodeURIComponent(cid)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Failed to unpin', details: text }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
