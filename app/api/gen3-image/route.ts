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

    // Parse metadata from IPFS
    const cid = tokenURI.replace('ipfs://', '');
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
    ];

    let metadata;
    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway);
        if (response.ok) {
          metadata = await response.json();
          break;
        }
      } catch (err) {
        console.error(`Gateway ${gateway} failed:`, err);
      }
    }

    if (metadata && metadata.animation_url) {
      return NextResponse.redirect(metadata.animation_url);
    } else if (metadata && metadata.image) {
      return NextResponse.redirect(metadata.image);
    }

    return NextResponse.json({ error: 'No image found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching Gen3 image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

