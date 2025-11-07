import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

type GiftDetail = { recipient: string; tokenId: number; recipientUsername?: string | null };
type CachedGifter = { address: string; count: number; username: string | null; fid: number | null; pfp: string | null; recipients: string[]; uniqueRecipients: number; gifts: GiftDetail[] };

// Force dynamic, no cache at Next layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // Query transfers table for gifts (is_gift = true)
    const { data: gifts, error: giftsError } = await supabase
      .from('transfers')
      .select('token_id, from_address, to_address')
      .eq('is_gift', true)
      .order('block_number', { ascending: false });

    if (giftsError) {
      console.error('[Top Gifters] Error fetching gifts:', giftsError);
      return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 });
    }

    // Count gifts per gifter
    const giftCounts: Record<string, number> = {};
    const giftRecipients: Record<string, Set<string>> = {};
    const giftDetails: Record<string, Array<{ recipient: string; tokenId: number }>> = {};

    for (const gift of gifts || []) {
      const gifterAddress = gift.from_address.toLowerCase();
      const recipientAddress = gift.to_address.toLowerCase();

      giftCounts[gifterAddress] = (giftCounts[gifterAddress] || 0) + 1;

      if (!giftRecipients[gifterAddress]) {
        giftRecipients[gifterAddress] = new Set();
        giftDetails[gifterAddress] = [];
      }
      giftRecipients[gifterAddress].add(recipientAddress);
      giftDetails[gifterAddress].push({
        recipient: recipientAddress,
        tokenId: parseInt(gift.token_id),
      });
    }

    // Sort by count and get top 10
    const topGifters = Object.entries(giftCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, count]) => ({ address, count }));

    // Collect ALL addresses (gifters + all recipients) for a single bulk lookup
    const allRecipientAddresses = new Set<string>();
    topGifters.forEach(({ address }) => {
      if (giftRecipients[address]) {
        giftRecipients[address].forEach(addr => allRecipientAddresses.add(addr));
      }
    });

    // Look up usernames from Neynar - SINGLE BATCH CALL
    if (process.env.NEYNAR_API_KEY && topGifters.length > 0) {
      const neynarConfig = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
      const neynarClient = new NeynarAPIClient(neynarConfig);

      const addresses = topGifters.map(({ address }) => address);
      const allAddressesForLookup = [...addresses, ...Array.from(allRecipientAddresses)];

      if (allAddressesForLookup.length === 0) {
        return NextResponse.json([]);
      }

      try {
        const usersResponse = await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses: allAddressesForLookup
        });

        const topGiftersWithUsernames: CachedGifter[] = topGifters.map(({ address, count }) => {
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

        return NextResponse.json(topGiftersWithUsernames);
      } catch (neynarError) {
        console.error('[Top Gifters] Error fetching usernames:', neynarError);
        const fallback = topGifters.map(({ address, count }) => ({
          address,
          count,
          username: null,
          fid: null,
          pfp: null,
          recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [],
          uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0,
          gifts: giftDetails[address] || []
        }));
        return NextResponse.json(fallback);
      }
    }

    const result = topGifters.map(({ address, count }) => ({
      address,
      count,
      username: null,
      fid: null,
      pfp: null,
      recipients: giftRecipients[address] ? Array.from(giftRecipients[address]) : [],
      uniqueRecipients: giftRecipients[address] ? giftRecipients[address].size : 0,
      gifts: giftDetails[address] || []
    }));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Top Gifters] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
