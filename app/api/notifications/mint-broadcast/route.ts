import { sendNotification } from '@/app/services/notifications';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/notifications/mint-broadcast
 *
 * Broadcast notification when someone mints an NFT
 * Sends to all registered users (you'll need to track who has the app added)
 */
export async function POST(request: NextRequest) {
  try {
    const { minterFid, minterUsername, transactionHash } = await request.json();

    if (!minterFid || !transactionHash) {
      return NextResponse.json(
        { error: 'minterFid and transactionHash are required' },
        { status: 400 }
      );
    }

    // Broadcast to ALL users who have the app added and notifications enabled
    // Empty array = all users (Neynar handles filtering)
    await sendNotification(
      [], // Empty array broadcasts to all users with notifications enabled
      '🎃 New Pumpkin Minted!',
      `@${minterUsername || 'Someone'} just carved their personality NFT!`,
      `https://bushleague.xyz`
    );

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('❌ Broadcast notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

