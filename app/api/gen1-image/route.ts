import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const CONTRACT_ADDRESS = '0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6';

const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId') || '1';

  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    // Get token URI from contract
    const tokenURI = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    console.log(`Token URI for Gen1 #${tokenId}:`, tokenURI);

    // Gen1 contract returns JSON metadata directly (not IPFS URL)
    let imageUrl = '';
    try {
      const metadata = JSON.parse(tokenURI);
      console.log('Parsed metadata:', metadata);

      // Extract animation_url first (GIF), then fall back to image
      imageUrl = metadata.animation_url || metadata.image;
      console.log('Found image URL:', imageUrl);
    } catch (parseErr) {
      // tokenURI is not JSON, might be direct IPFS URL
      console.log('Token URI is not JSON, trying as URL');

      if (tokenURI.startsWith('ipfs://') || tokenURI.startsWith('http')) {
        imageUrl = tokenURI;
      } else {
        return NextResponse.json({ error: 'Could not parse metadata' }, { status: 400 });
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Invalid token URI format' }, { status: 400 });
    }

    // Fetch and proxy the image with caching
    console.log(`🔗 Fetching Gen1 image from: ${imageUrl}`);

    // Convert IPFS URLs to gateway URLs with fallbacks
    let httpUrl = imageUrl;
    let imageResponse;
    let imageBuffer;

    if (imageUrl.startsWith('ipfs://')) {
      const cid = imageUrl.replace('ipfs://', '');

      // Try multiple gateways
      const gateways = [
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`
      ];

      console.log(`📥 Trying IPFS gateways for Gen1 CID: ${cid}`);

      // Try each gateway in order
      for (const gateway of gateways) {
        try {
          console.log(`  Trying: ${gateway}`);
          imageResponse = await fetch(gateway, {
            signal: AbortSignal.timeout(5000) // 5 second timeout per gateway
          });

          if (imageResponse.ok) {
            console.log(`✅ Successfully fetched Gen1 from: ${gateway}`);
            httpUrl = gateway;
            break;
          }
        } catch (err) {
          console.log(`  Failed: ${gateway}`);
          continue;
        }
      }

      if (!imageResponse || !imageResponse.ok) {
        throw new Error(`Failed to fetch Gen1 from all IPFS gateways`);
      }
    } else {
      // Regular HTTP URL
      console.log(`📥 Fetching Gen1 from: ${httpUrl}`);
      imageResponse = await fetch(httpUrl);

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch Gen1 image: ${imageResponse.statusText}`);
      }
    }

    imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/gif';

    console.log(`✅ Successfully fetched Gen1 image, content-type: ${contentType}`);

    // Return the image with caching headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error fetching Gen1 image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


