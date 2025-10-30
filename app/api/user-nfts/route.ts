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
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  try {
    // Use Alchemy's NFT API to get the list of owned NFTs
    const apiKey = process.env.ALCHEMY_API_KEY || 'demo';
    const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${apiKey}`;

    console.log(`Fetching NFTs for ${address} from contract ${CONTRACT_ADDRESS}`);

    const response = await fetch(
      `${baseUrl}/getNFTsForOwner?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}`
    );

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Now query the blockchain directly for tokenURIs
    const client = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    const userNFTs = [];

    if (data.ownedNfts && Array.isArray(data.ownedNfts)) {
      for (const nft of data.ownedNfts) {
        try {
          // Extract tokenId
          let tokenId: number;
          if (typeof nft.tokenId === 'number') {
            tokenId = nft.tokenId;
          } else if (typeof nft.tokenId === 'string' && nft.tokenId.startsWith('0x')) {
            tokenId = parseInt(nft.tokenId, 16);
          } else {
            tokenId = parseInt(nft.tokenId, 10);
          }

          // Query the contract directly for tokenURI
          let imageUrl = '';
          try {
            const tokenURI = await client.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: NFT_ABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            });

            // Parse the tokenURI to get the image
            try {
              // First try fetching as IPFS
              if (tokenURI.startsWith('ipfs://')) {
                imageUrl = `/api/proxy-image?url=${encodeURIComponent(tokenURI)}`;
              } else if (tokenURI.startsWith('http')) {
                imageUrl = tokenURI;
              } else {
                // Try to parse as JSON metadata
                const metadata = JSON.parse(tokenURI);
                if (metadata.image) {
                  if (metadata.image.startsWith('ipfs://')) {
                    imageUrl = `/api/proxy-image?url=${encodeURIComponent(metadata.image)}`;
                  } else {
                    imageUrl = metadata.image;
                  }
                }
              }
            } catch (parseError) {
              // tokenURI is not JSON, might be a direct URL
              console.log(`TokenURI for ${tokenId}: ${tokenURI}`);
            }
          } catch (err) {
            console.error(`Error fetching tokenURI for token ${tokenId}:`, err);
          }

          userNFTs.push({ tokenId, imageUrl });
        } catch (err) {
          console.error('Error processing NFT:', err, nft);
        }
      }
    }

    console.log(`Found ${userNFTs.length} NFTs for address ${address}`);

    return NextResponse.json(userNFTs);
  } catch (error: any) {
    console.error('Error fetching user NFTs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
