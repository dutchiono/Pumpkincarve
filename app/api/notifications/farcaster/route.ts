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

    console.log('📬 Test notification request:', { fid, title, body, url });

    if (!fid || !title || !body) {
      return NextResponse.json(
        { error: 'fid, title, and body are required' },
        { status: 400 }
      );
    }

    // Check if NEYNAR_API_KEY is set
    if (!process.env.NEYNAR_API_KEY) {
      console.error('❌ NEYNAR_API_KEY not configured');
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      );
    }

    // Send Farcaster notification via Neynar to single user
    const targetUrl = url || process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz';
    await sendNotification([fid], title, body, targetUrl);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Farcaster notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

