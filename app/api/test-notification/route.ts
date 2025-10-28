import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const neynarConfig = new Configuration({
      apiKey: process.env.NEYNAR_API_KEY || '',
    });
    const client = new NeynarAPIClient(neynarConfig);

    console.log('🔑 API Key exists:', !!process.env.NEYNAR_API_KEY);

    // Test sending a notification to your FID
    const testFid = 474867;

    const response = await client.publishFrameNotifications({
      targetFids: [testFid],
      notification: {
        title: '🧪 Test',
        body: 'Testing notifications from server',
        target_url: 'https://bushleague.xyz'
      }
    });

    console.log('✅ Response:', response);

    return NextResponse.json({
      success: true,
      response,
      apiKeyExists: !!process.env.NEYNAR_API_KEY
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}

