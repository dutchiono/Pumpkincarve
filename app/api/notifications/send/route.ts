import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/notifications/send
 *
 * Send a notification to a user via Farcaster SDK
 *
 * Request body:
 * {
 *   fid: number,           // Farcaster ID of the user
 *   title: string,         // Notification title (max 64 chars)
 *   body: string,          // Notification body (max 256 chars)
 *   url?: string           // URL to open when notification is clicked (optional)
 * }
 *
 * Note: This endpoint requires the user to have enabled notifications
 * and the notification token/URL to be stored in the database (via webhook)
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, title, body, url } = await request.json();

    console.log('📨 Sending notification:', { fid, title, body, url });

    if (!fid || !title || !body) {
      return NextResponse.json(
        { error: 'fid, title, and body are required' },
        { status: 400 }
      );
    }

    // TODO: Fetch notification token and URL from database
    // Example database query:
    // const notification = await db.notifications.findUnique({
    //   where: { fid },
    //   select: { token: true, url: true, enabled: true }
    // });
    //
    // if (!notification || !notification.enabled) {
    //   return NextResponse.json(
    //     { error: 'Notifications not enabled for this user' },
    //     { status: 400 }
    //   );
    //
    //   const { token, url: notificationUrl } = notification;

    // For now, we'll return an error since we don't have database storage yet
    // Once you have database storage set up, uncomment the code above and below

    // Send notification via POST request to the user's notification URL
    // const response = await fetch(notificationUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify({
    //     title: title.substring(0, 64),  // Max 64 chars
    //     body: body.substring(0, 256),   // Max 256 chars
    //     url: url || process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz'
    //   })
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Failed to send notification: ${response.statusText}`);
    // }

    // Temporary response until database is set up
    return NextResponse.json({
      success: false,
      error: 'Notification storage not implemented yet',
      message: 'Please set up database storage for notification tokens via webhook endpoint'
    }, { status: 501 });

    // Once database is set up, return this instead:
    // return NextResponse.json({
    //   success: true,
    //   message: 'Notification sent successfully'
    // });
  } catch (error: any) {
    console.error('❌ Send notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

