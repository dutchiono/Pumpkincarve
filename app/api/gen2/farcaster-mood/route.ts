
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Neynar client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const neynarClient = NEYNAR_API_KEY ? new NeynarAPIClient({ apiKey: NEYNAR_API_KEY }) : null;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Farcaster User ID is required' }, { status: 400 });
    }

    if (!neynarClient) {
      return NextResponse.json({ error: 'Neynar API Key not configured' }, { status: 500 });
    }

    // Try to get user - userId can be FID or username
    // First try FID lookup
    let fid: number | null = null;

    // Check if userId is a number (FID)
    if (!isNaN(Number(userId))) {
      fid = Number(userId);
    } else {
      // Try username lookup
      try {
        const userResponse = await neynarClient.lookupUserByUsername(userId);
        // @ts-ignore - SDK types may be incomplete
        if (userResponse && userResponse.fid) {
          // @ts-ignore
          fid = userResponse.fid;
        }
      } catch (e) {
        // Username lookup failed, continue
      }
    }

    if (!fid) {
      return NextResponse.json({ error: 'Farcaster user not found' }, { status: 404 });
    }

    const castsResponse = await neynarClient.fetchCastsForUser({ fid, limit: 100 });

    // Perform a very basic sentiment analysis (placeholder logic)
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    if (castsResponse && castsResponse.casts && Array.isArray(castsResponse.casts)) {
      castsResponse.casts.forEach((cast: any) => {
        const text = cast.text?.toLowerCase() || '';
        if (text.includes('happy') || text.includes('great') || text.includes('love')) {
          positiveCount++;
        } else if (text.includes('sad') || text.includes('bad') || text.includes('hate')) {
          negativeCount++;
        } else {
          neutralCount++;
        }
      });
    }

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
