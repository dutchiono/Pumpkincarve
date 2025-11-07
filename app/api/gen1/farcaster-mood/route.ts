import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read .env file directly
function getEnvVar(key: string): string | undefined {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse KEY=VALUE
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match && match[1].trim() === key) {
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch (error) {
    console.error(`[Farcaster Mood API] Error reading .env file:`, error);
  }

  // Fallback to process.env if .env file doesn't have it
  return process.env[key];
}

export async function POST(req: NextRequest) {
  try {
    // Read directly from .env file
    const NEYNAR_API_KEY = getEnvVar('NEYNAR_API_KEY');
    const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

    // Initialize Neynar client
    if (!NEYNAR_API_KEY || NEYNAR_API_KEY.trim() === '') {
      console.error('[Farcaster Mood API] NEYNAR_API_KEY not found in .env file');
      return NextResponse.json({ error: 'Neynar API Key not configured in .env file' }, { status: 500 });
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      console.error('[Farcaster Mood API] OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    // Trim whitespace
    const trimmedKey = NEYNAR_API_KEY.trim();

    console.log('[Farcaster Mood API] Using API key from .env file (first 8 chars):', trimmedKey.substring(0, 8) + '...');

    const neynarConfig = new Configuration({ apiKey: trimmedKey });
    const neynarClient = new NeynarAPIClient(neynarConfig);

    const body = await req.json();
    const { userId, password, autoTrigger } = body;

    // Log for debugging
    console.log('[Farcaster Mood API] Request received:', {
      hasUserId: !!userId,
      hasPassword: !!password,
      autoTrigger: autoTrigger === true || autoTrigger === 'true'
    });

    if (!userId) {
      console.error('[Farcaster Mood API] userId is required');
      return NextResponse.json({ error: 'Farcaster User ID is required' }, { status: 400 });
    }

    // Password protection - check password (skip for auto-trigger from mint flow)
    // Handle autoTrigger as boolean or string
    const isAutoTrigger = autoTrigger === true || autoTrigger === 'true' || autoTrigger === 1;

    if (!isAutoTrigger) {
      const MOOD_ANALYSIS_PASSWORD = getEnvVar('MOOD_ANALYSIS_PASSWORD');
      if (!MOOD_ANALYSIS_PASSWORD || MOOD_ANALYSIS_PASSWORD.trim() === '') {
        console.error('[Farcaster Mood API] MOOD_ANALYSIS_PASSWORD not configured in .env file');
        return NextResponse.json({ error: 'Mood analysis is currently disabled (password not configured)' }, { status: 503 });
      }

      if (!password || password !== MOOD_ANALYSIS_PASSWORD.trim()) {
        console.error('[Farcaster Mood API] Invalid password attempt');
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    } else {
      console.log('[Farcaster Mood API] Auto-trigger mode (password skipped)');
    }

    console.log('[Farcaster Mood API] Analyzing mood for user:', userId);

    // Try to get user - userId can be FID or username
    let fid: number | null = null;

    // Check if userId is a number (FID)
    if (!isNaN(Number(userId))) {
      fid = Number(userId);
    } else {
      // Try username lookup - remove @ symbol if present
      const cleanUsername = userId.replace(/^@/, '');
      try {
        const userResponse: any = await neynarClient.lookupUserByUsername({ username: cleanUsername });
        // Handle different response structures from Neynar SDK
        if (userResponse && userResponse.result && userResponse.result.user && userResponse.result.user.fid) {
          fid = userResponse.result.user.fid;
        } else if (userResponse && userResponse.user && userResponse.user.fid) {
          fid = userResponse.user.fid;
        } else if (userResponse && (userResponse as any).fid) {
          fid = (userResponse as any).fid;
        }
      } catch (e: any) {
        console.error('[Farcaster Mood API] Username lookup failed:', e?.message || e);
        console.error('[Farcaster Mood API] Error details:', {
          status: e?.response?.status || e?.status,
          statusText: e?.response?.statusText,
          data: e?.response?.data || e?.data,
          message: e?.message,
        });

        // Check if it's an auth error
        if (e?.response?.status === 401 || e?.status === 401 || e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
          console.error('[Farcaster Mood API] Neynar API returned 401 Unauthorized');
          console.error('[Farcaster Mood API] API Key (first 8 chars):', NEYNAR_API_KEY?.substring(0, 8) || 'MISSING');
          console.error('[Farcaster Mood API] API Key length:', NEYNAR_API_KEY?.length || 0);

          // For auto-trigger mode, return a more graceful error that won't break the mint flow
          if (isAutoTrigger) {
            console.log('[Farcaster Mood API] Auto-trigger mode: Neynar API failed, returning default settings');
            return NextResponse.json({
              mood: 'neutral',
              personality: 'Balanced',
              reasoning: 'AI analysis unavailable (Neynar API error), using default settings',
              postsAnalyzed: 0,
              color1: '#4ade80',
              color2: '#22d3ee',
              baseFrequency: 0.02,
              flowFieldBaseFrequency: 0.02,
              flowFieldsBaseFrequency: 0.01,
              flowLineDensity: 0.15,
            });
          }

          return NextResponse.json({
            error: 'Neynar API authentication failed',
            details: 'The API key may be incorrect, expired, or missing permissions. Please verify your NEYNAR_API_KEY in .env matches your Neynar dashboard.',
            troubleshooting: [
              '1. Check your Neynar API key at https://neynar.com/',
              '2. Ensure NEYNAR_API_KEY is set in your .env file',
              '3. Verify the key has not expired or been revoked',
              '4. Restart your dev server after updating .env'
            ]
          }, { status: 401 });
        }
        // Username lookup failed for other reasons, continue
      }
    }

    if (!fid) {
      console.error('[Farcaster Mood API] Could not determine FID for user:', userId);
      return NextResponse.json({ error: 'Farcaster user not found' }, { status: 404 });
    }

    console.log('[Farcaster Mood API] Found FID:', fid);

    console.log('[Farcaster Mood API] Fetching casts for FID:', fid);
    let castsResponse;
    try {
      // Neynar API max limit is 150, not 250
      castsResponse = await neynarClient.fetchCastsForUser({ fid, limit: 150 });
    } catch (e: any) {
      console.error('[Farcaster Mood API] Failed to fetch casts:', e?.message || e);
      if (e?.response?.status === 401 || e?.status === 401 || e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
        // For auto-trigger mode, return default settings instead of failing
        if (isAutoTrigger) {
          console.log('[Farcaster Mood API] Auto-trigger mode: Failed to fetch casts (Neynar API error), returning default settings');
          return NextResponse.json({
            mood: 'neutral',
            personality: 'Balanced',
            reasoning: 'AI analysis unavailable (Neynar API error), using default settings',
            postsAnalyzed: 0,
            color1: '#4ade80',
            color2: '#22d3ee',
            baseFrequency: 0.02,
            flowFieldBaseFrequency: 0.02,
            flowFieldsBaseFrequency: 0.01,
            flowLineDensity: 0.15,
          });
        }

        return NextResponse.json({
          error: 'Neynar API authentication failed while fetching casts',
          details: 'The API key may be incorrect, expired, or missing permissions'
        }, { status: 401 });
      }
      throw e;
    }
    const casts = castsResponse?.casts || [];
    const postsAnalyzed = casts.length;
    console.log('[Farcaster Mood API] Found', postsAnalyzed, 'casts');

    // Fetch user profile to get bio - try to get from casts if available
    let userBio = '';
    try {
      // Try to get bio from the first cast's author info, or skip if not available
      if (casts.length > 0 && casts[0]?.author) {
        const author = casts[0].author as any;
        if (author?.profile?.bio) {
          userBio = typeof author.profile.bio === 'string' ? author.profile.bio : (author.profile.bio.text || '');
        } else if (author?.bio) {
          userBio = typeof author.bio === 'string' ? author.bio : (author.bio.text || '');
        }
      }
      console.log('[Farcaster Mood API] User bio:', userBio ? `${userBio.substring(0, 50)}...` : 'none (bio not in casts)');
    } catch (bioError: any) {
      console.error('[Farcaster Mood API] Could not extract user bio from casts:', bioError?.message || bioError);
      // Bio is optional, continue without it
    }

    if (postsAnalyzed === 0) {
      return NextResponse.json({
        mood: 'neutral',
        personality: 'Unknown',
        reasoning: 'No posts found to analyze',
        postsAnalyzed: 0,
        color1: '#4ade80',
        color2: '#22d3ee',
        baseFrequency: 0.02,
        flowFieldBaseFrequency: 0.02,
        flowFieldsBaseFrequency: 0.01,
        flowLineDensity: 0.15,
      });
    }

        // Prepare posts text for AI analysis
        // Neynar API max is 150, so we use all casts we got
        const postTexts = casts
          .map((cast: any) => cast.text || '')
          .filter((text: string) => text.length > 0)
          .join('\n\n');

    // Call OpenAI GPT-4o-mini for AI sentiment analysis
    const analysisPrompt = `
You are an AI personality analyst. Analyze the following Farcaster user's profile and recent posts to understand their personality, mood, and creative energy:

USERNAME: @${userId}
${userBio ? `BIO: ${userBio}\n` : ''}
RECENT POSTS (${postsAnalyzed} total posts analyzed):
${postTexts}

Based on their bio and posting patterns, provide a comprehensive personality and mood analysis in JSON format:
{
  "mood": "happy|sad|neutral|mixed|energetic|contemplative|optimistic|pessimistic|creative|analytical|social|introspective",
  "personality": "Creative|Technical|Social|Adventurous|Thoughtful|Mystical|Balanced|Artistic|Intellectual|Community-focused|Entrepreneurial|Philosophical",
  "traits": ["trait1", "trait2", "trait3"],
  "interests": ["interest1", "interest2", "interest3"],
  "reasoning": "A thoughtful 2-3 sentence explanation of your analysis, referencing specific patterns from their posts and bio",
  "color1": "#HEXCODE (dominant color representing their energy and personality - be creative and specific, avoid generic colors like #ff0000 or #0000ff)",
  "color2": "#HEXCODE (complementary or contrasting color that pairs well with color1 - create an interesting color palette)",
  "baseFrequency": 0.015 (legacy field, recommended NFT animation frequency between 0.01-0.03, where lower=calmer/more contemplative, higher=more energetic/active),
  "flowFieldBaseFrequency": 0.02 (background flow field base frequency between 0.01-0.05, controls background animation smoothness and speed),
  "flowFieldsBaseFrequency": 0.01 (flow field lines base frequency between 0.005-0.03, controls line animation smoothness and complexity),
  "flowLineDensity": 0.15 (line density between 0.05-0.5, controls how many lines appear - NEVER above 0.5, lower=fewer lines/more minimal, higher=more lines/dense patterns)
}

Analysis Guidelines:
- mood: Determine the overall emotional tone and energy level from their posts and bio
- personality: Identify the dominant personality archetype that best describes them
- traits: Extract 3 key personality characteristics that stand out (e.g., "curious", "witty", "thoughtful")
- interests: Identify the top 3 topics, themes, or subjects they discuss most frequently
- reasoning: Provide specific examples from their content that led to your analysis
- color1/color2: Choose colors that genuinely represent their personality - be creative but meaningful (e.g., if they're energetic and creative, use vibrant but sophisticated colors; if contemplative, use deeper, richer tones)
- baseFrequency: Legacy field for backward compatibility (match to flowFieldBaseFrequency)
- flowFieldBaseFrequency: Background animation speed - energetic people might have slightly higher values (0.025-0.04), calm/contemplative people lower (0.01-0.02)
- flowFieldsBaseFrequency: Line animation complexity - technical/analytical people might prefer slightly higher complexity (0.015-0.025), artistic/flowing people lower (0.005-0.015)
- flowLineDensity: Visual density of lines - minimal/aesthetic people lower (0.05-0.2), detail-oriented/active people higher (0.2-0.4), but NEVER exceed 0.5

Return ONLY valid JSON, no markdown formatting, no code blocks, no additional text.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that analyzes social media presence and returns ONLY valid JSON responses with no markdown formatting.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    let analysis;

    try {
      analysis = JSON.parse(openaiData.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', openaiData.choices[0].message.content);
      // Fallback to basic analysis
      analysis = {
        mood: 'neutral',
        personality: 'Balanced',
        reasoning: 'Could not parse AI response',
        color1: '#4ade80',
        color2: '#22d3ee',
        baseFrequency: 0.02,
        flowFieldBaseFrequency: 0.02,
        flowFieldsBaseFrequency: 0.01,
        flowLineDensity: 0.15,
      };
    }

    // Ensure flowLineDensity never exceeds 0.5
    const flowLineDensity = Math.min(analysis.flowLineDensity || 0.15, 0.5);

    return NextResponse.json({
      mood: analysis.mood || 'neutral',
      personality: analysis.personality || 'Balanced',
      traits: analysis.traits || [],
      interests: analysis.interests || [],
      reasoning: analysis.reasoning || 'Analysis completed',
      postsAnalyzed,
      color1: analysis.color1 || '#4ade80',
      color2: analysis.color2 || '#22d3ee',
      baseFrequency: analysis.baseFrequency || analysis.flowFieldBaseFrequency || 0.02,
      flowFieldBaseFrequency: analysis.flowFieldBaseFrequency || analysis.baseFrequency || 0.02,
      flowFieldsBaseFrequency: analysis.flowFieldsBaseFrequency || 0.01,
      flowLineDensity: flowLineDensity,
    });
  } catch (error: any) {
    console.error('[Farcaster Mood API] Error:', error);
    console.error('[Farcaster Mood API] Error stack:', error?.stack);
    return NextResponse.json({
      error: 'Failed to fetch Farcaster mood',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

