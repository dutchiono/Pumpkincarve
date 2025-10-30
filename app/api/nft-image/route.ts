import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C';

const NFT_ABI = [
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
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json({ error: 'tokenId required' }, { status: 400 });
  }

  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    // Get token URI from contract
    const tokenURI = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    console.log(`🔍 TokenURI for token ${tokenId}:`, tokenURI);

    // Parse the tokenURI to get the image
    let imageUrl = '';
    
    // Try to parse as JSON metadata
    try {
      const metadata = JSON.parse(tokenURI);
      console.log(`✅ Parsed metadata for token ${tokenId}:`, metadata);
      if (metadata.image) {
        imageUrl = metadata.image;
        console.log(`📸 Image URL: ${imageUrl}`);
      }
    } catch (parseErr) {
      console.log(`ℹ️ TokenURI is not JSON for token ${tokenId}, trying as URL: ${tokenURI}`);
      // If not JSON, try as direct URL
      if (tokenURI.startsWith('http')) {
        imageUrl = tokenURI;
      } else if (tokenURI.startsWith('ipfs://')) {
        // Already IPFS URL
        imageUrl = tokenURI;
      }
    }

    // Fetch and proxy the image
    if (imageUrl) {
      console.log(`🔗 Fetching image from: ${imageUrl}`);
      
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
        
        console.log(`📥 Trying IPFS gateways for CID: ${cid}`);
        
        // Try each gateway in order
        for (const gateway of gateways) {
          try {
            console.log(`  Trying: ${gateway}`);
            imageResponse = await fetch(gateway, { 
              signal: AbortSignal.timeout(5000) // 5 second timeout per gateway
            });
            
            if (imageResponse.ok) {
              console.log(`✅ Successfully fetched from: ${gateway}`);
              httpUrl = gateway;
              break;
            }
          } catch (err) {
            console.log(`  Failed: ${gateway}`);
            continue;
          }
        }
        
        if (!imageResponse || !imageResponse.ok) {
          throw new Error(`Failed to fetch from all IPFS gateways`);
        }
      } else {
        // Regular HTTP URL
        console.log(`📥 Fetching from: ${httpUrl}`);
        imageResponse = await fetch(httpUrl);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
      }
      
      imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      
      console.log(`✅ Successfully fetched image, content-type: ${contentType}`);
      
      // Return the image
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    console.error(`❌ Could not determine image URL for token ${tokenId}`);
    return NextResponse.json({ error: 'Could not determine image URL' }, { status: 500 });
  } catch (error: any) {
    console.error('Error fetching NFT image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

