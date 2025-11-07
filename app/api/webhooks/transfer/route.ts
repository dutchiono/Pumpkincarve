import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Webhook endpoint to track NFT transfers
 * Called when a Transfer event is detected (for gifters leaderboard)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenId,
      fromAddress,
      toAddress,
      blockNumber,
      transactionHash,
    } = body;

    // Validate required fields
    if (!tokenId || !fromAddress || !toAddress || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, fromAddress, toAddress, transactionHash' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const fromLower = fromAddress.toLowerCase();
    const toLower = toAddress.toLowerCase();
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Determine if this is a mint or a gift
    const isMint = fromLower === zeroAddress || !fromLower;
    const isGift = !isMint && fromLower !== toLower;

    // Insert transfer record
    const { data: transferData, error: transferError } = await supabase
      .from('transfers')
      .insert({
        token_id: BigInt(tokenId).toString(),
        from_address: fromLower,
        to_address: toLower,
        block_number: blockNumber ? BigInt(blockNumber).toString() : null,
        transaction_hash: transactionHash,
        is_mint: isMint,
        is_gift: isGift,
      })
      .select()
      .single();

    if (transferError) {
      // If duplicate, that's okay (idempotent)
      if (transferError.code === '23505') {
        console.log(`[Transfer Webhook] Transfer ${transactionHash} already tracked`);
        return NextResponse.json({
          success: true,
          message: 'Transfer already tracked',
        });
      }
      console.error('[Transfer Webhook] Supabase error:', transferError);
      return NextResponse.json(
        { error: 'Failed to track transfer', details: transferError.message },
        { status: 500 }
      );
    }

    console.log(`[Transfer Webhook] Successfully tracked transfer: tokenId=${tokenId}, from=${fromLower}, to=${toLower}, isGift=${isGift}`);

    return NextResponse.json({
      success: true,
      transfer: transferData,
    });
  } catch (error: any) {
    console.error('[Transfer Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track transfer', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

