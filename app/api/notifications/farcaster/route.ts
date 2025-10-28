import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/app/services/notifications';

/**
 * POST /api/notifications/farcaster
 *
 * Send a Farcaster in-app notification
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, title, body, url } = await request.json();

    if (!fid || !title || !body) {
      return NextResponse.json(
        { error: 'fid, title, and body are required' },
        { status: 400 }
      );
    }

    // Send Farcaster notification via Neynar
    await sendNotification([fid], title, body, url || window.location.href);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Farcaster notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

