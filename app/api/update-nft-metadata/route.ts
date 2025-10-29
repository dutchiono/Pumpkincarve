import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// NOTE: This is a minimal relayer stub. It validates input and returns success.
// Integrate on-chain call/signing as needed.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, imageUrl, metadata, network } = body || {};

    if (typeof tokenId !== 'number' && typeof tokenId !== 'string') {
      return NextResponse.json({ error: 'tokenId is required' }, { status: 400 });
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    if (!metadata || typeof metadata !== 'string') {
      return NextResponse.json({ error: 'metadata (stringified JSON) is required' }, { status: 400 });
    }

    // Placeholder response to unblock the frontend flow
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
