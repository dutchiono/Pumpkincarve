import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

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

    const supabase = createSupabaseAdmin();

    if (event === 'notification.enabled') {
      if (!token || !url) {
        return NextResponse.json(
          { error: 'token and url are required for notification.enabled event' },
          { status: 400 }
        );
      }

      // Store notification token and URL for this user
      const { error: dbError } = await supabase
        .from('notifications')
        .upsert({
          fid: fid.toString(),
          token,
          url,
          enabled: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'fid',
        });

      if (dbError) {
        console.error('❌ Error storing notification:', dbError);
        return NextResponse.json(
          { error: 'Failed to store notification settings' },
          { status: 500 }
        );
      }

      console.log(`✅ Notifications enabled for FID ${fid}`);

      return NextResponse.json({
        success: true,
        message: 'Notification enabled',
        fid
      });
    } else if (event === 'notification.disabled') {
      // Mark notifications as disabled for this user
      const { error: dbError } = await supabase
        .from('notifications')
        .update({
          enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('fid', fid.toString());

      if (dbError) {
        console.error('❌ Error updating notification:', dbError);
        // Don't fail if record doesn't exist
        if (dbError.code !== 'PGRST116') {
          return NextResponse.json(
            { error: 'Failed to update notification settings' },
            { status: 500 }
          );
        }
      }

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

