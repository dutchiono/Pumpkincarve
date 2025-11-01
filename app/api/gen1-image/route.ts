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
    try {
      const metadata = JSON.parse(tokenURI);
      console.log('Parsed metadata:', metadata);

      // Extract animation_url first (GIF), then fall back to image
      const imageUrl = metadata.animation_url || metadata.image;

      if (imageUrl) {
        console.log('Found image URL:', imageUrl);

        // If it's IPFS, convert to gateway URL
        if (imageUrl.startsWith('ipfs://')) {
          const cid = imageUrl.replace('ipfs://', '');
          return NextResponse.redirect(`https://gateway.pinata.cloud/ipfs/${cid}`);
        }

        return NextResponse.redirect(imageUrl);
      }
    } catch (parseErr) {
      // tokenURI is not JSON, might be direct IPFS URL
      console.log('Token URI is not JSON, trying as URL');

      if (tokenURI.startsWith('ipfs://')) {
        const cid = tokenURI.replace('ipfs://', '');
        return NextResponse.redirect(`https://gateway.pinata.cloud/ipfs/${cid}`);
      }

      return NextResponse.json({ error: 'Could not parse metadata' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid token URI format' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching Gen1 image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


