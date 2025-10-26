import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📬 Webhook received:', body);

    // Farcaster sends different webhook events
    // User enables notifications: sends token
    if (body.type === 'notification.token') {
      const { token, fid } = body;
      console.log(`✅ User ${fid} enabled notifications, token: ${token.substring(0, 20)}...`);

      // TODO: Store token in database associated with FID
      // await db.notificationTokens.upsert({
      //   where: { fid },
      //   update: { token, updatedAt: new Date() },
      //   create: { fid, token, createdAt: new Date(), updatedAt: new Date() }
      // });

      return NextResponse.json({ success: true });
    }

    // User disables notifications: removes token
    if (body.type === 'notification.disabled') {
      const { fid } = body;
      console.log(`❌ User ${fid} disabled notifications`);

      // TODO: Remove token from database
      // await db.notificationTokens.delete({ where: { fid } });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Unknown webhook type' });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

