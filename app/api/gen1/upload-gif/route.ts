import { uploadToIPFS } from '@/app/services/ipfs';
import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('gif');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No GIF file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to IPFS
    const cid = await uploadToIPFS(buffer, 'image/gif', 'gen1-animation.gif');
    const ipfsUrl = `ipfs://${cid}`;

    return NextResponse.json({ ipfsUrl, cid });

  } catch (error: any) {
    console.error('GIF upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload GIF to IPFS' },
      { status: 500 }
    );
  }
}


