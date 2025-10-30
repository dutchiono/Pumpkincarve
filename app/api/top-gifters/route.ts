import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { NextResponse } from 'next/server';
import { join } from 'path';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

const TRANSFER_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;

const ERC721_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type GiftDetail = { recipient: string; tokenId: number; recipientUsername?: string | null };
type CachedGifter = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null; recipients: string[]; uniqueRecipients: number; gifts: GiftDetail[] };
type CacheData = { gifters: CachedGifter[]; lastUpdate: number; lastBlock: number };

const CACHE_DIR = join(process.cwd(), '.cache');
const CACHE_FILE = join(CACHE_DIR, 'top-gifters.json');
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Initialize cache directory
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function loadCache(): CacheData | null {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading cache:', err);
  }
  return null;
}

function saveCache(data: CacheData) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving cache:', err);
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  console.log('Leaderboard[gifters] CONTRACT_ADDRESS =', CONTRACT_ADDRESS);
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  // Load cache from disk
  const cachedData = loadCache();
  const now = Date.now();

  // Check if cached data is still valid
  if (cachedData && cachedData.lastUpdate && (now - cachedData.lastUpdate) < CACHE_TTL) {
    const age = Math.floor((now - cachedData.lastUpdate) / 1000);
    console.log(`✅ Returning cached top gifters (age: ${age}s, from block ${cachedData.lastBlock})`);
    return NextResponse.json(cachedData.gifters);
  }

  const lastProcessedBlock = cachedData?.lastBlock || 0;

  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://1rpc.io/base'),
    });

    // Get total supply to limit search
    const totalSupply = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    });

    console.log(`Total supply: ${totalSupply}`);

    const currentBlock = await client.getBlockNumber();
    const MAX_BLOCK_RANGE = BigInt(4000);

    // If we have a cached result, only scan new blocks since last cache
    // First time: scan 200k blocks to get all historical data
    // After that: only scan new blocks
    let fromBlock;
    if (lastProcessedBlock > 0) {
      fromBlock = BigInt(lastProcessedBlock);
      console.log(`📊 Incremental update: scanning from block ${fromBlock} to ${currentBlock}`);
    } else {
      fromBlock = currentBlock - BigInt(200000);
      console.log(`🔄 Initial scan: scanning last 200k blocks from ${fromBlock} to ${currentBlock}`);
    }

    const allLogs = [];
    console.log(`🔍 Searching Transfer events from block ${fromBlock} to ${currentBlock} (${Number(currentBlock - fromBlock)} blocks)`);

    // Query in batches
    while (fromBlock < currentBlock) {
      const toBlock: bigint = fromBlock + MAX_BLOCK_RANGE > currentBlock ? currentBlock : fromBlock + MAX_BLOCK_RANGE;

      const logs = await client.getLogs({
        address: CONTRACT_ADDRESS as `0x${string}`,
        event: TRANSFER_ABI[0],
        fromBlock: fromBlock,
        toBlock: toBlock,
      });

      allLogs.push(...logs);
      if (logs.length > 0) {
        console.log(`Found ${logs.length} Transfer logs in block range ${fromBlock} to ${toBlock}`);
      }

      fromBlock = toBlock + BigInt(1);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📈 Found ${allLogs.length} total Transfer events across all blocks`);

    // Filter out mints (from = 0x0) and track gifts (from != 0x0 and from != to)
    const giftCounts: Record<string, number> = {};
    const giftRecipients: Record<string, Set<string>> = {};
    const giftDetails: Record<string, Array<{ recipient: string; tokenId: number }>> = {};

    let mintCount = 0;
    let giftCount = 0;
    let selfTransferCount = 0;

    for (const log of allLogs) {
      const from = log.args.from?.toLowerCase() || '';
      const to = log.args.to?.toLowerCase() || '';
      const tokenId = log.args.tokenId ? Number(log.args.tokenId) : 0;

      // Categorize the transfer
      if (!from) {
        mintCount++;
      } else if (from === '0x0000000000000000000000000000000000000000') {
        mintCount++;
      } else if (from === to) {
        selfTransferCount++;
      } else {
        // This is a gift
        giftCount++;
        giftCounts[from] = (giftCounts[from] || 0) + 1;

        if (!giftRecipients[from]) {
          giftRecipients[from] = new Set();
          giftDetails[from] = [];
        }
        giftRecipients[from].add(to);
        giftDetails[from].push({ recipient: to, tokenId });
      }
    }

    console.log(`📊 Transfer breakdown: ${mintCount} mints, ${selfTransferCount} self-transfers, ${giftCount} gifts`);

    // Sort by count and get top 10
    const topGifters = Object.entries(giftCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log(`Top gifters: ${JSON.stringify(topGifters)}`);

    // Collect ALL addresses (gifters + all recipients) for a single bulk lookup
    const allRecipientAddresses = new Set<string>();
    topGifters.forEach(([address]) => {
      if (giftRecipients[address]) {
        giftRecipients[address].forEach(addr => allRecipientAddresses.add(addr));
      }
    });

    // Look up usernames from Neynar - SINGLE BATCH CALL
    if (process.env.NEYNAR_API_KEY) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topGifters.map(([address]) => address);
      const allAddressesForLookup = [...addresses, ...Array.from(allRecipientAddresses)];

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses: allAddressesForLookup
        });

        const topGiftersWithUsernames: CachedGifter[] = topGifters.map(([address, count]) => {
          console.log(`📝 Processing gifter: ${address}, count: ${count}, recipients: [${Array.from(giftRecipients[address] || [])}]`);
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

          // Build gift details with usernames
          const gifts: GiftDetail[] = giftDetails[address]?.map(({ recipient, tokenId }) => {
            const recipKey = Object.keys(usersResponse).find(
              key => key.toLowerCase() === recipient.toLowerCase()
            );
            let recipientUsername = null;
            if (recipKey && usersResponse[recipKey]?.length > 0) {
              recipientUsername = usersResponse[recipKey][0].username || null;
            }
            return { recipient, tokenId, recipientUsername };
          }) || [];

          const recipientAddresses = giftRecipients[address] ? Array.from(giftRecipients[address]) : [];
          return {
            address,
            count,
            username,
            fid,
            pfp: pfp || null,
            recipients: recipientAddresses,
            uniqueRecipients: recipientAddresses.length,
            gifts
          };
        });

        const result = topGiftersWithUsernames;
        saveCache({
          gifters: result,
          lastUpdate: Date.now(),
          lastBlock: Number(currentBlock)
        });
        return NextResponse.json(result);
      } catch (neynarError) {
        console.error('Error fetching usernames:', neynarError);
        const fallback = topGifters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null, recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [], uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0, gifts: giftDetails[address] || [] }));
        saveCache({
          gifters: fallback,
          lastUpdate: Date.now(),
          lastBlock: Number(currentBlock)
        });
        return NextResponse.json(fallback);
      }
    }

  const result = topGifters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null, recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [], uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0, gifts: giftDetails[address] || [] }));
  saveCache({
    gifters: result,
    lastUpdate: Date.now(),
    lastBlock: Number(currentBlock)
  });
  return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching top gifters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

