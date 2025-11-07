import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

type CachedHolder = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null };

// Force dynamic, no cache at Next layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // Get all transfers ordered by block number to track current ownership
    const { data: transfers, error: transfersError } = await supabase
      .from('transfers')
      .select('token_id, to_address, block_number')
      .order('block_number', { ascending: true });

    if (transfersError) {
      console.error('[Top Holders] Error fetching transfers:', transfersError);
      return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
    }

    // Build a map of current token ownership (last transfer wins)
    const currentOwnership: Record<string, string> = {};
    for (const transfer of transfers || []) {
      currentOwnership[transfer.token_id] = transfer.to_address.toLowerCase();
    }

    // Count NFTs per address
    const holders: Record<string, number> = {};
    for (const tokenId in currentOwnership) {
      const address = currentOwnership[tokenId];
      holders[address] = (holders[address] || 0) + 1;
    }

    // Sort by count and get top 10
    const topHolders = Object.entries(holders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, count]) => ({ address, count }));

    // Look up usernames from Neynar
    if (process.env.NEYNAR_API_KEY && topHolders.length > 0) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topHolders.map(({ address }) => address);

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses
        });

        const topHoldersWithUsernames: CachedHolder[] = await Promise.all(
          topHolders.map(async ({ address, count }): Promise<CachedHolder> => {
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

        return NextResponse.json(topHoldersWithUsernames);
      } catch (neynarError) {
        console.error('[Top Holders] Error fetching usernames:', neynarError);
        const fallback = topHolders.map(({ address, count }) => ({ address, count, username: null, fid: null, pfp: null }));
        return NextResponse.json(fallback);
      }
    }

    const result = topHolders.map(({ address, count }) => ({ address, count, username: null, fid: null, pfp: null }));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Top Holders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
