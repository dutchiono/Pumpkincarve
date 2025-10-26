
import { NextRequest, NextResponse } from 'next/server';
import { uploadToIPFS } from '@/app/services/ipfs';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    const cid = await uploadToIPFS(buffer, contentType, 'pumpkin.png');

    const ipfsUrl = `ipfs://${cid}`;

    return NextResponse.json({ ipfsUrl, cid });

  } catch (error: any) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload to IPFS' },
      { status: 500 }
    );
  }
}

