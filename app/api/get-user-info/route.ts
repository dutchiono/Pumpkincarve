import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body || {};

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    // Use Neynar service directly instead of fetching
    const { Configuration, NeynarAPIClient } = await import('@neynar/nodejs-sdk');
    const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY || '' });
    const client = new NeynarAPIClient(neynarConfig);

    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
    }

    const response = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });
    const responseKeys = Object.keys(response);
    const matchingKey = responseKeys.find(key => key.toLowerCase() === address.toLowerCase());

    if (!matchingKey) {
      return NextResponse.json({ error: 'No Farcaster account found' }, { status: 404 });
    }

    const users = response[matchingKey];
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No Farcaster account found' }, { status: 404 });
    }

    const user = users[0];
    return NextResponse.json({
      fid: user.fid || null,
      username: user.username || null,
      pfp: user.pfp_url || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
