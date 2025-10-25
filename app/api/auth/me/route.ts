import { createClient, Errors } from '@farcaster/quick-auth';
import { NextResponse } from 'next/server';

const quickAuthClient = createClient();

export async function GET(request: Request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Get the app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Verify the JWT token using the quick auth client
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: appUrl,
    });

    // Get additional user information from Farcaster
    // The payload.sub contains the FID (Farcaster ID)
    const fid = payload.sub;

    // Optionally fetch more user data from Farcaster API
    let userInfo = {
      fid,
      verified: true,
    };

    // You can fetch additional user data here if needed
    // For example, from your database or Farcaster API

    return NextResponse.json({
      user: userInfo,
    });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      console.error('Invalid token:', error.message);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
