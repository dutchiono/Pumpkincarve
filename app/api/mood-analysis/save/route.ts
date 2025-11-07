import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fid,
      walletAddress,
      tokenId,
      mood,
      personality,
      traits,
      interests,
      reasoning,
      color1,
      color2,
      baseFrequency,
      flowFieldBaseFrequency,
      flowFieldsBaseFrequency,
      flowLineDensity,
      postsAnalyzed,
    } = body;

    if (!fid && !walletAddress) {
      return NextResponse.json(
        { error: 'Either fid or walletAddress is required' },
        { status: 400 }
      );
    }

    if (!mood || !personality) {
      return NextResponse.json(
        { error: 'mood and personality are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('mood_analyses')
      .insert({
        fid: fid || null,
        wallet_address: walletAddress || null,
        token_id: tokenId || null,
        mood,
        personality,
        traits: traits || [],
        interests: interests || [],
        reasoning: reasoning || '',
        color1: color1 || '#4ade80',
        color2: color2 || '#22d3ee',
        base_frequency: baseFrequency || 0.02,
        flow_field_base_frequency: flowFieldBaseFrequency || 0.02,
        flow_fields_base_frequency: flowFieldsBaseFrequency || 0.01,
        flow_line_density: flowLineDensity || 0.15,
        posts_analyzed: postsAnalyzed || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Mood Analysis Save] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save mood analysis', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      analysis: data,
    });
  } catch (error: any) {
    console.error('[Mood Analysis Save] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save mood analysis', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

