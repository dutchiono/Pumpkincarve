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

    // TODO: Replace with actual list of FIDs who have the app added
    // For now, you could:
    // 1. Query your database for users who have enabled notifications
    // 2. Or send to a specific group
    const targetFids = [
      474867, // Your FID for testing
      // Add more FIDs here or fetch from database
    ];

    // Send notification to all users
    if (targetFids.length > 0) {
      await sendNotification(
        targetFids,
        '🎃 New Pumpkin Minted!',
        `@${minterUsername || 'Someone'} just carved their personality NFT!`,
        `https://bushleague.xyz`
      );
    }

    return NextResponse.json({
      success: true,
      notifiedCount: targetFids.length
    });
  } catch (error: any) {
    console.error('❌ Broadcast notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

