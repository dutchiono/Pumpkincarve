import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

type CachedMinter = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null };

// Force dynamic, no cache at Next layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // Query mints table to get mint counts per address
    const { data: mints, error: mintsError } = await supabase
      .from('mints')
      .select('minter_address')
      .order('timestamp', { ascending: false });

    if (mintsError) {
      console.error('[Top Minters] Error fetching mints:', mintsError);
      return NextResponse.json({ error: 'Failed to fetch mints' }, { status: 500 });
    }

    // Count mints per address
    const mintCounts: Record<string, number> = {};
    for (const mint of mints || []) {
      const address = mint.minter_address.toLowerCase();
      mintCounts[address] = (mintCounts[address] || 0) + 1;
    }

    // Sort by count and get top 10
    const topMintersArray = Object.entries(mintCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const topMinters = topMintersArray.map(([address, count]) => ({ address, count }));

    // Look up usernames from Neynar for each address
    if (process.env.NEYNAR_API_KEY && topMinters.length > 0) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topMinters.map(({ address }) => address);

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses
        });

        // Map addresses to usernames
        const topMintersWithUsernames: CachedMinter[] = await Promise.all(
          topMinters.map(async ({ address, count }): Promise<CachedMinter> => {
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

        return NextResponse.json(topMintersWithUsernames);
      } catch (neynarError) {
        console.error('[Top Minters] Error fetching usernames:', neynarError);
        // Fall back to addresses only if username lookup fails
        const fallback = topMinters.map(({ address, count }) => ({ address, count, username: null, fid: null, pfp: null }));
        return NextResponse.json(fallback);
      }
    }

    const result = topMinters.map(({ address, count }) => ({ address, count, username: null, fid: null, pfp: null }));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Top Minters] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
