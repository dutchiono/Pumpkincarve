import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
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
let giftersCache: CachedGifter[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
  }

  // TEMPORARILY DISABLE CACHE FOR DEBUGGING
  // Check cache
  const cacheAge = Date.now() - lastCacheUpdate;
  if (false && giftersCache.length > 0 && cacheAge < CACHE_TTL) {
    console.log(`✅ Returning cached top gifters (age: ${Math.floor(cacheAge / 1000)}s)`);
    return NextResponse.json(giftersCache);
  }

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
    const allLogs = [];

    // Search backwards from current block - INCREASED RANGE TO 200K BLOCKS
    let fromBlock = currentBlock - BigInt(200000);

    console.log(`🔍 Searching Transfer events from block ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);

    // Query in batches
    while (fromBlock < currentBlock) {
      const toBlock = fromBlock + MAX_BLOCK_RANGE > currentBlock ? currentBlock : fromBlock + MAX_BLOCK_RANGE;

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

        giftersCache = topGiftersWithUsernames;
        lastCacheUpdate = Date.now();
        return NextResponse.json(topGiftersWithUsernames);
      } catch (neynarError) {
        console.error('Error fetching usernames:', neynarError);
        const fallback = topGifters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null, recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [], uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0, gifts: giftDetails[address] || [] }));
        giftersCache = fallback;
        lastCacheUpdate = Date.now();
        return NextResponse.json(fallback);
      }
    }

    const result = topGifters.map(([address, count]) => ({ address, count, username: null, fid: null, pfp: null, recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [], uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0, gifts: giftDetails[address] || [] }));
    giftersCache = result;
    lastCacheUpdate = Date.now();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching top gifters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

