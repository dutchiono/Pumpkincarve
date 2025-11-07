import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/farcaster
 *
 * Webhook endpoint to handle Farcaster notification enable/disable events
 * When users toggle notifications in the hamburger menu, Farcaster sends events here
 *
 * Webhook payload structure (from Farcaster SDK):
 * {
 *   event: 'notification.enabled' | 'notification.disabled',
 *   fid: number,
 *   token?: string,  // Notification token (provided when enabled)
 *   url?: string     // Notification URL (provided when enabled)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, fid, token, url } = body;

    console.log('📬 Farcaster notification webhook:', { event, fid, token: token ? '***' : undefined, url });

    if (!event || !fid) {
      return NextResponse.json(
        { error: 'event and fid are required' },
        { status: 400 }
      );
    }

    // TODO: Store notification tokens and URLs in database
    // For now, we'll log them. In production, store in your database:
    // - fid: user's Farcaster ID
    // - token: notification token (for sending notifications)
    // - url: notification URL (for sending notifications)
    // - enabled: boolean (whether notifications are enabled)
    // - updatedAt: timestamp

    if (event === 'notification.enabled') {
      if (!token || !url) {
        return NextResponse.json(
          { error: 'token and url are required for notification.enabled event' },
          { status: 400 }
        );
      }

      // Store notification token and URL for this user
      // Example database operation:
      // await db.notifications.upsert({
      //   where: { fid },
      //   update: { token, url, enabled: true, updatedAt: new Date() },
      //   create: { fid, token, url, enabled: true, createdAt: new Date(), updatedAt: new Date() }
      // });

      console.log(`✅ Notifications enabled for FID ${fid}`);

      return NextResponse.json({
        success: true,
        message: 'Notification enabled',
        fid
      });
    } else if (event === 'notification.disabled') {
      // Mark notifications as disabled for this user
      // Example database operation:
      // await db.notifications.update({
      //   where: { fid },
      //   data: { enabled: false, updatedAt: new Date() }
      // });

      console.log(`❌ Notifications disabled for FID ${fid}`);

      return NextResponse.json({
        success: true,
        message: 'Notification disabled',
        fid
      });
    } else {
      return NextResponse.json(
        { error: `Unknown event type: ${event}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Farcaster notification webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

