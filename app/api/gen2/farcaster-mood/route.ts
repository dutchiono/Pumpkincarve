
import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

// Initialize Neynar client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const neynarClient = NEYNAR_API_KEY ? new NeynarAPIClient(NEYNAR_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Farcaster User ID is required' }, { status: 400 });
    }

    if (!neynarClient) {
      return NextResponse.json({ error: 'Neynar API Key not configured' }, { status: 500 });
    }

    // Fetch user's casts (posts)
    // Neynar API typically uses FID (Farcaster ID) or username.
    // Assuming userId can be either for now, or we might need a lookup step.
    // For simplicity, let's assume userId is a username for now.
    const user = await neynarClient.lookupUserByUsername(userId);
    if (!user) {
      return NextResponse.json({ error: 'Farcaster user not found' }, { status: 404 });
    }

    const casts = await neynarClient.fetchCastsForUser(user.fid);

    // Perform a very basic sentiment analysis (placeholder logic)
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    casts.messages.forEach(cast => {
      const text = cast.text.toLowerCase();
      if (text.includes('happy') || text.includes('great') || text.includes('love')) {
        positiveCount++;
      } else if (text.includes('sad') || text.includes('bad') || text.includes('hate')) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    let mood = 'neutral';
    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      mood = 'happy';
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      mood = 'sad';
    } else if (positiveCount > 0 || negativeCount > 0) {
      mood = 'mixed';
    }

    return NextResponse.json({ mood });
  } catch (error) {
    console.error('Error in Farcaster mood API:', error);
    return NextResponse.json({ error: 'Failed to fetch Farcaster mood' }, { status: 500 });
  }
}
