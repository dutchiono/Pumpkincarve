import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ERC721_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type CachedMinter = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null };
type MinterCacheData = { minters: CachedMinter[]; lastUpdate: number; lastBlock: number };

const CACHE_DIR = join(process.cwd(), '.cache');
const CACHE_FILE = join(CACHE_DIR, 'top-minters.json');
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function loadMintersCache(): MinterCacheData | null {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading minters cache:', err);
  }
  return null;
}

function saveMintersCache(data: MinterCacheData) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving minters cache:', err);
  }
}

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

// Force dynamic, no cache at Next layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  // Load cache from disk
  const cachedData = loadMintersCache();
  const now = Date.now();

  if (cachedData && cachedData.lastUpdate && (now - cachedData.lastUpdate) < CACHE_TTL) {
    const age = Math.floor((now - cachedData.lastUpdate) / 1000);
    console.log(`✅ Returning cached top minters (age: ${age}s)`);
    return NextResponse.json(cachedData.minters);
  }

  try {
    // Query Base mainnet using public RPC
    const mainnetClient = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    const currentBlock = await mainnetClient.getBlockNumber();

    // RPC providers limit to 5,000 blocks per query (1rpc.io), so we need to query in chunks
    const MAX_BLOCK_RANGE = BigInt(4000);
    const allLogs = [];

    // Start from 20k blocks ago or go back as far as needed
    let fromBlock = currentBlock - BigInt(20000);

    console.log(`Searching from block ${fromBlock} to latest (${currentBlock}) in chunks`);

    // Query in batches of 10k blocks
    while (fromBlock < currentBlock) {
      const toBlock = fromBlock + MAX_BLOCK_RANGE > currentBlock ? currentBlock : fromBlock + MAX_BLOCK_RANGE;

      console.log(`Querying blocks ${fromBlock} to ${toBlock}`);

      const logs = await mainnetClient.getLogs({
        address: CONTRACT_ADDRESS as `0x${string}`,
        event: PUMPKIN_MINT_ABI[0],
        fromBlock: fromBlock,
        toBlock: toBlock,
      });

      allLogs.push(...logs);
      console.log(`Found ${logs.length} logs in this batch, total: ${allLogs.length}`);

      fromBlock = toBlock + BigInt(1);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Found ${allLogs.length} total logs on Base mainnet`);
    const logs = allLogs;

    // Get unique addresses from mint events
    const uniqueAddresses = new Set<string>();
    for (const log of logs) {
      const address = log.args.to?.toLowerCase() || '';
      if (address) {
        uniqueAddresses.add(address);
      }
    }

    // Count actual NFT holdings using balanceOf (current state)
    const mintCounts: Record<string, number> = {};
    for (const address of Array.from(uniqueAddresses)) {
      try {
        const balance = await mainnetClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: ERC721_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        mintCounts[address] = Number(balance);
      } catch (err) {
        console.error(`Error getting balance for ${address}:`, err);
        mintCounts[address] = 0;
      }
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
        saveMintersCache({ minters: topMintersWithUsernames, lastUpdate: Date.now(), lastBlock: 0 });
        return NextResponse.json(topMintersWithUsernames);
      } catch (neynarError) {
        console.error('Error fetching usernames:', neynarError);
        // Fall back to addresses only if username lookup fails
        const fallback = topMinters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
        saveMintersCache({ minters: fallback, lastUpdate: Date.now(), lastBlock: 0 });
        return NextResponse.json(fallback);
      }
    }

  const result = topMinters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
  saveMintersCache({ minters: result, lastUpdate: Date.now(), lastBlock: 0 });
  return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching top minters:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

