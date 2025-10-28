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

    console.log(`Token URI for Gen3 #${tokenId}:`, tokenURI);

    // Use the same pattern as pumpkin NFTs - proxy through proxy-image API
    if (tokenURI.startsWith('ipfs://')) {
      // Check if it's metadata JSON or direct IPFS image
      const cid = tokenURI.replace('ipfs://', '');
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      
      try {
        // Try to fetch and see if it's JSON or direct image
        const response = await fetch(gatewayUrl);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('json')) {
            // It's metadata JSON - extract animation_url
            const metadata = await response.json();
            if (metadata.animation_url) {
              return NextResponse.redirect(metadata.animation_url);
            }
            if (metadata.image) {
              return NextResponse.redirect(metadata.image);
            }
          } else {
            // It's a direct image (GIF)
            return response.body ? new NextResponse(response.body, { 
              headers: { 'Content-Type': contentType || 'image/gif' } 
            }) : NextResponse.json({ error: 'No content' }, { status: 404 });
          }
        }
      } catch (fetchErr) {
        console.error('Error fetching from IPFS:', fetchErr);
      }

      // Fallback to proxy
      return NextResponse.redirect(`/api/proxy-image?url=${encodeURIComponent(tokenURI)}`);
    }

    return NextResponse.json({ error: 'Invalid token URI format' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching Gen3 image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

