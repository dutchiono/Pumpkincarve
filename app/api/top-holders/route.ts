import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C';

const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type CachedHolder = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null };
type HolderCacheData = { holders: CachedHolder[]; lastUpdate: number };

const CACHE_DIR = join(process.cwd(), '.cache');
const CACHE_FILE = join(CACHE_DIR, 'top-holders.json');
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function loadHoldersCache(): HolderCacheData | null {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading holders cache:', err);
  }
  return null;
}

function saveHoldersCache(data: HolderCacheData) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving holders cache:', err);
  }
}

// Force dynamic, no cache at Next layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  // Load cache from disk
  const cachedData = loadHoldersCache();
  const now = Date.now();

  if (cachedData && cachedData.lastUpdate && (now - cachedData.lastUpdate) < CACHE_TTL) {
    const age = Math.floor((now - cachedData.lastUpdate) / 1000);
    console.log(`✅ Returning cached top holders (age: ${age}s)`);
    return NextResponse.json(cachedData.holders);
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    // Get total supply
    const totalSupply = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    });

    console.log(`Total supply: ${totalSupply}`);

    // For each token, find its owner
    const holders: Record<string, number> = {};
    const tokenIds = Array.from({ length: Number(totalSupply) }, (_, i) => BigInt(i + 1));

    for (const tokenId of tokenIds) {
      try {
        const owner = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: ERC721_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        });
        const address = owner.toLowerCase();
        holders[address] = (holders[address] || 0) + 1;
      } catch (err) {
        console.error(`Error getting owner of token ${tokenId}:`, err);
      }
    }

    // Sort by count
    const topHolders = Object.entries(holders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Look up usernames from Neynar
    if (process.env.NEYNAR_API_KEY) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topHolders.map(([address]) => address);

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses
        });

        const topHoldersWithUsernames: CachedHolder[] = await Promise.all(
          topHolders.map(async ([address, count]): Promise<CachedHolder> => {
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

        saveHoldersCache({ holders: topHoldersWithUsernames, lastUpdate: Date.now() });
        return NextResponse.json(topHoldersWithUsernames);
      } catch (neynarError) {
        console.error('Error fetching usernames:', neynarError);
        const fallback = topHolders.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
        saveHoldersCache({ holders: fallback, lastUpdate: Date.now() });
        return NextResponse.json(fallback);
      }
    }

  const result = topHolders.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null }));
  saveHoldersCache({ holders: result, lastUpdate: Date.now() });
  return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching top holders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

