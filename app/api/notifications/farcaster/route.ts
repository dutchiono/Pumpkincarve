import { sendNotification } from '@/app/services/notifications';
import { NextRequest, NextResponse } from 'next/server';

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

    // Send Farcaster notification via Neynar to single user
    const targetUrl = url || process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz';
    await sendNotification([fid], title, body, targetUrl);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Farcaster notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

