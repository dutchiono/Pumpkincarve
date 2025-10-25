import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { NextRequest, NextResponse } from 'next/server';

const neynarConfig = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const client = new NeynarAPIClient(neynarConfig);

console.log('🔧 Neynar API Route loaded. API Key exists:', !!process.env.NEYNAR_API_KEY);

export async function GET(request: NextRequest) {
  console.log('❌ GET method called on /api/neynar/user - returning 405');
  return NextResponse.json({ error: 'Use POST method' }, { status: 405 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('📬 POST /api/neynar/user called');

  try {
    const body = await request.json();
    console.log('📦 Request body:', body);

    const { address } = body;

    if (!address) {
      console.log('❌ No address provided');
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.log('❌ NEYNAR_API_KEY not set');
      return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
    }

    console.log('🔍 Fetching user by address:', address);

    // Get user by address to get their FID
    const response = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });
    console.log('✅ Neynar response:', JSON.stringify(response, null, 2));

    // The API returns users keyed by address (lowercase)
    // Find the matching entry regardless of case
    const responseKeys = Object.keys(response);
    const matchingKey = responseKeys.find(key => key.toLowerCase() === address.toLowerCase());

    if (!matchingKey) {
      console.log('❌ No Farcaster account found for address:', address);
      console.log('Available keys:', responseKeys);
      return NextResponse.json({ error: 'No Farcaster account found for this address' }, { status: 404 });
    }

    const users = response[matchingKey];
    if (!users || users.length === 0) {
      console.log('❌ No users in response for address:', address);
      return NextResponse.json({ error: 'No Farcaster account found for this address' }, { status: 404 });
    }

    const user = users[0];
    const fid = user.fid;

    console.log('✅ Found user:', user.username, 'FID:', fid);

    // Fetch user's last 100 casts
    console.log('📝 Fetching casts for FID:', fid);
    const castsResponse = await client.fetchCastsForUser({ fid: fid, limit: 100 });
    console.log('🔍 Raw casts response structure:', Object.keys(castsResponse));
    console.log('✅ Casts fetched, count:', castsResponse?.casts?.length || 0);

    // Format posts for display - handle different response structures
    const casts = castsResponse?.casts || [];
    const posts = casts.map((cast: any) => ({
      text: cast.text || '',
      hash: cast.hash,
      timestamp: cast.timestamp,
      likes: cast.reactions?.likes?.length || 0,
      recasts: cast.reactions?.recasts?.length || 0,
    }));

    const responseData = {
      posts: posts,
      pfp: user.pfp_url || '',
      username: user.username || '',
      fid: user.fid,
      displayName: user.display_name || '',
      bio: user.profile?.bio?.text || '',
    };

    console.log('✅ Returning user data for:', user.username);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('❌ Error in /api/neynar/user:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user data', details: error.toString() },
      { status: 500 }
    );
  }
}
