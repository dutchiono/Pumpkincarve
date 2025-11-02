import { NextRequest, NextResponse } from 'next/server';
import { uploadToIPFS } from '@/app/services/ipfs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const gifBlob = formData.get('gif') as Blob;
    const settingsJson = formData.get('settings') as string;

    if (!gifBlob || !settingsJson) {
      return NextResponse.json({ error: 'Missing gif or settings' }, { status: 400 });
    }

    console.log('Uploading GIF to IPFS...');
    const arrayBuffer = await gifBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const imageCid = await uploadToIPFS(buffer, 'image/gif', 'gen1-animation.gif');
    const imageUrl = `ipfs://${imageCid}`;
    
    console.log('Image uploaded:', imageUrl);

    // Parse settings
    const settings = JSON.parse(settingsJson);
    
    // Create metadata
    const metadata = {
      name: `Gen1 NFT #${Date.now()}`,
      description: 'A generative Gen1 NFT with dynamic visual layers',
      image: imageUrl,
      animation_url: imageUrl,
      attributes: settings,
    };

    console.log('Uploading metadata to IPFS...');
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const metadataCid = await uploadToIPFS(metadataBuffer, 'application/json', 'metadata.json');
    const metadataUrl = `ipfs://${metadataCid}`;
    
    console.log('Metadata uploaded:', metadataUrl);

    return NextResponse.json({
      imageUrl,
      metadataUrl,
      imageCid,
      metadataCid,
    });

  } catch (error: any) {
    console.error('Browser mint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

