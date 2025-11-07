import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Security: Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const neynarKey = process.env.NEYNAR_API_KEY || '';

  return NextResponse.json({
    hasNeynarKey: !!neynarKey,
    keyLength: neynarKey.length,
    keyFirst12: neynarKey.substring(0, 12),
    keyLast8: neynarKey.length > 8 ? neynarKey.substring(neynarKey.length - 8) : '',
    keyHasWhitespace: neynarKey.includes(' ') || neynarKey.includes('\n') || neynarKey.includes('\r'),
    allEnvVarsWithNeynar: Object.keys(process.env).filter(k => k.includes('NEYNAR')),
    nodeEnv: process.env.NODE_ENV,
  });
}

