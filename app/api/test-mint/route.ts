import { NextRequest, NextResponse } from 'next/server';

// Test endpoint that uses local image for minting
export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    console.log('🧪 TEST MINT - Using local image...');
    console.log('Image URL:', imageUrl);

    // Return the local image URL directly (no IPFS needed for testing)
    return NextResponse.json({
      ipfsUrl: imageUrl, // Use the local image URL
      cid: 'test-pumpkin',
    });

  } catch (error: any) {
    console.error('Test mint error:', error);
    return NextResponse.json(
      { error: error.message || 'Test mint failed' },
      { status: 500 }
    );
  }
}
