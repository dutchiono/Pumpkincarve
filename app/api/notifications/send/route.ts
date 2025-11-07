import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

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

    const supabase = createSupabaseAdmin();

    // Fetch notification token and URL from database
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('token, url, enabled')
      .eq('fid', fid.toString())
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notifications not enabled for this user' },
        { status: 400 }
      );
    }

    if (!notification.enabled) {
      return NextResponse.json(
        { error: 'Notifications are disabled for this user' },
        { status: 400 }
      );
    }

    if (!notification.token || !notification.url) {
      return NextResponse.json(
        { error: 'Notification token or URL missing' },
        { status: 500 }
      );
    }

    // Send notification via POST request to the user's notification URL
    const response = await fetch(notification.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${notification.token}`
      },
      body: JSON.stringify({
        title: title.substring(0, 64),  // Max 64 chars
        body: body.substring(0, 256),   // Max 256 chars
        url: url || process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send notification: ${response.status} ${errorText}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error: any) {
    console.error('❌ Send notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

