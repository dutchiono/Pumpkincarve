import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

const PUMPKIN_MINT_ABI = [
  {
    type: 'event',
    name: 'PumpkinCarvingMinted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'imageUrl', type: 'string' },
    ],
  },
] as const;

export async function GET() {
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://base.blockscout.com/api/v2/eth'),
    });

    // Query mint events from the contract
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS as `0x${string}`,
      event: PUMPKIN_MINT_ABI[0],
      fromBlock: 'earliest',
    });

    // Count mints per address
    const mintCounts: Record<string, number> = {};
    for (const log of logs) {
      const address = log.args.to?.toLowerCase() || '';
      mintCounts[address] = (mintCounts[address] || 0) + 1;
    }

    // Sort by count and get top 10
    const topMinters = Object.entries(mintCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, count]) => ({
        address,
        count,
      }));

    return NextResponse.json(topMinters);
  } catch (error: any) {
    console.error('Error fetching top minters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

