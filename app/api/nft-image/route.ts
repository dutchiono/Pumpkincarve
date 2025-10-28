import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

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

    // Return image URL for proxy-image to handle
    if (imageUrl) {
      console.log(`🔗 Returning proxy URL: ${imageUrl}`);
      return NextResponse.redirect(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
    }

    console.error(`❌ Could not determine image URL for token ${tokenId}`);
    return NextResponse.json({ error: 'Could not determine image URL' }, { status: 500 });
  } catch (error: any) {
    console.error('Error fetching NFT image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

