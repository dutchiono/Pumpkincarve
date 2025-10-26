import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Server-side in-memory cache for top minters
type CachedMinter = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null };
let topMintersCache: CachedMinter[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  // Check cache first - return immediately if data is fresh
  const cacheAge = Date.now() - lastCacheUpdate;
  if (topMintersCache.length > 0 && cacheAge < CACHE_TTL) {
    console.log(`✅ Returning cached top minters (age: ${Math.floor(cacheAge / 1000)}s)`);
    return NextResponse.json(topMintersCache);
  }

  try {
    // Query Base mainnet using public RPC
    const mainnetClient = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    // Use recent block instead of 'earliest' for speed
    const currentBlock = await mainnetClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(10000); // Last ~10k blocks (~3 days)

    const logs = await mainnetClient.getLogs({
      address: CONTRACT_ADDRESS as `0x${string}`,
      event: PUMPKIN_MINT_ABI[0],
      fromBlock: fromBlock,
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} logs on Base mainnet`);

    // Count mints per address
    const mintCounts: Record<string, number> = {};
    for (const log of logs) {
      const address = log.args.to?.toLowerCase() || '';
      mintCounts[address] = (mintCounts[address] || 0) + 1;
    }

    // Sort by count and get top 10
    const topMinters = Object.entries(mintCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Look up usernames from Neynar for each address
    if (process.env.NEYNAR_API_KEY) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topMinters.map(([address]) => address);

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses
        });

        // Map addresses to usernames
        const topMintersWithUsernames: CachedMinter[] = await Promise.all(
          topMinters.map(async ([address, count]): Promise<CachedMinter> => {
            const matchingKey = Object.keys(usersResponse).find(
              key => key.toLowerCase() === address.toLowerCase()
            );

            let username = null;
            let fid = null;
            let pfp = null;

            if (matchingKey && usersResponse[matchingKey]?.length > 0) {
              const user = usersResponse[matchingKey][0];
              username = user.username;
              fid = user.fid;
              pfp = user.pfp_url;
            }

            return { address, count, username, fid, pfp: pfp || null };
          })
        );

        // Cache and return
        topMintersCache = topMintersWithUsernames;
        lastCacheUpdate = Date.now();
        return NextResponse.json(topMintersWithUsernames);
      } catch (neynarError) {
        console.error('Error fetching usernames:', neynarError);
        // Fall back to addresses only if username lookup fails
        const fallback = topMinters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
        topMintersCache = fallback;
        lastCacheUpdate = Date.now();
        return NextResponse.json(fallback);
      }
    }

    const result = topMinters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
    topMintersCache = result;
    lastCacheUpdate = Date.now();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching top minters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

