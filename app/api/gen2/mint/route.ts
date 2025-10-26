
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import { uploadToIPFS } from '@/app/services/ipfs';
import { traits } from '@/app/gen2-creator/traits';

export async function POST(req: NextRequest) {
  try {
    const selectedTraits = await req.json();

    // Generate Image
    const imageLayers = Object.entries(selectedTraits).map(([trait, option]) => {
      if (option === 'None') return null;
      const imagePath = path.join(process.cwd(), 'public', 'gen2-assets', trait, `${option}.svg`);
      return { input: imagePath };
    }).filter(layer => layer !== null) as { input: string }[];

    if (imageLayers.length === 0) {
      return new NextResponse('No traits selected', { status: 400 });
    }

    const compositeImage = await sharp({ 
        create: { 
            width: 500, 
            height: 500, 
            channels: 4, 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
        }
    })
      .composite(imageLayers)
      .png()
      .toBuffer();

    // Upload Image to IPFS
    const imageCid = await uploadToIPFS(compositeImage, 'image/png', 'gen2.png');
    const imageUrl = `ipfs://${imageCid}`;

    // Generate Metadata
    const attributes = Object.entries(selectedTraits).map(([trait_type, value]) => ({ trait_type, value }));
    const metadata = {
      name: 'Gen2 NFT',
      description: 'A generative NFT from the Gen2 collection.',
      image: imageUrl,
      attributes: attributes,
    };

    // Upload Metadata to IPFS
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const metadataCid = await uploadToIPFS(metadataBuffer, 'application/json', 'metadata.json');
    const metadataUrl = `ipfs://${metadataCid}`;

    return NextResponse.json({ imageUrl, metadata });

  } catch (error) {
    console.error(error);
    return new NextResponse('Error minting NFT', { status: 500 });
  }
}
