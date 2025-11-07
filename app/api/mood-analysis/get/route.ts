import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');
    const walletAddress = searchParams.get('walletAddress');
    const tokenId = searchParams.get('tokenId');

    if (!fid && !walletAddress && !tokenId) {
      return NextResponse.json(
        { error: 'Either fid, walletAddress, or tokenId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('mood_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (fid) {
      query = query.eq('fid', parseInt(fid));
    }

    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase());
    }

    if (tokenId) {
      query = query.eq('token_id', parseInt(tokenId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Mood Analysis Get] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mood analyses', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analyses: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Mood Analysis Get] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mood analyses', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

