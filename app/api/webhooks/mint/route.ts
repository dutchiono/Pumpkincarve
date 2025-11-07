import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Webhook endpoint to track NFT mints
 * Called from Gen1MainApp after successful mint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenId,
      minterAddress,
      blockNumber,
      transactionHash,
      imageUrl,
      metadataUrl,
    } = body;

    // Validate required fields
    if (!tokenId || !minterAddress || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, minterAddress, transactionHash' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Insert mint record
    const { data: mintData, error: mintError } = await supabase
      .from('mints')
      .insert({
        token_id: BigInt(tokenId).toString(),
        minter_address: minterAddress.toLowerCase(),
        block_number: blockNumber ? BigInt(blockNumber).toString() : null,
        transaction_hash: transactionHash,
        image_url: imageUrl || null,
        metadata_url: metadataUrl || null,
      })
      .select()
      .single();

    if (mintError) {
      // If duplicate, that's okay (idempotent)
      if (mintError.code === '23505') {
        console.log(`[Mint Webhook] Mint ${tokenId} already tracked`);
        return NextResponse.json({
          success: true,
          message: 'Mint already tracked',
        });
      }
      console.error('[Mint Webhook] Supabase error:', mintError);
      return NextResponse.json(
        { error: 'Failed to track mint', details: mintError.message },
        { status: 500 }
      );
    }

    // Update admin stats - increment total mints
    try {
      const { data: currentStats } = await supabase
        .from('admin_stats')
        .select('value')
        .eq('key', 'total_mints')
        .single();

      const newTotal = (parseInt(currentStats?.value || '0') + 1).toString();

      const { error: statsError } = await supabase
        .from('admin_stats')
        .update({ value: newTotal, updated_at: new Date().toISOString() })
        .eq('key', 'total_mints');

      if (statsError) {
        console.error('[Mint Webhook] Error updating admin stats:', statsError);
        // Don't fail the request if stats update fails
      }
    } catch (error) {
      console.error('[Mint Webhook] Error updating admin stats:', error);
      // Don't fail the request if stats update fails
    }

    console.log(`[Mint Webhook] Successfully tracked mint: tokenId=${tokenId}, minter=${minterAddress}`);

    return NextResponse.json({
      success: true,
      mint: mintData,
    });
  } catch (error: any) {
    console.error('[Mint Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track mint', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

