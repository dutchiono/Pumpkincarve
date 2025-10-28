import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Neynar client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const neynarConfig = new Configuration({
  apiKey: NEYNAR_API_KEY || '',
});
const neynarClient = NEYNAR_API_KEY ? new NeynarAPIClient(neynarConfig) : null;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Farcaster User ID or Username is required' }, { status: 400 });
    }

    if (!neynarClient) {
      return NextResponse.json({ error: 'Neynar API Key not configured' }, { status: 500 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    // Determine if userId is an FID (number) or username (string)
    const isNumeric = /^\d+$/.test(userId.toString());
    let fid: number;

    if (isNumeric) {
      // userId is an FID
      fid = parseInt(userId);
    } else {
      // userId is a username - look up the FID using proper Neynar format
      const userResult = await neynarClient.lookupUserByUsername({ username: userId });
      if (!userResult || !userResult.user?.fid) {
        return NextResponse.json({ error: 'Farcaster user not found' }, { status: 404 });
      }
      fid = userResult.user.fid;
    }

    // Fetch user's last 100 casts
    const castsResponse = await neynarClient.fetchCastsForUser({ fid: fid, limit: 100 });
    const casts = castsResponse?.casts || [];

    if (casts.length === 0) {
      return NextResponse.json({ mood: 'No posts found - unable to analyze', personality: 'Unknown', postsAnalyzed: 0 });
    }

    // Extract post texts for OpenAI analysis
    const postTexts = casts
      .map((cast: any) => cast.text || '')
      .filter((text: string) => text.length > 0)
      .slice(0, 100)
      .join('\n\n');

    // Use OpenAI to analyze mood and personality AND recommend visual parameters
    const prompt = `
    Analyze the following user's recent Farcaster posts to understand their mood and personality.

    This analysis will be used to generate an animated "Mood Ring NFT" with flowing waves and contour patterns.
    You need to recommend colors and wave frequencies that match their vibe.

    RECENT POSTS (${casts.length} total):
    ${postTexts}

    Please provide:
    1. Overall mood/energy (Positive, Neutral, Mysterious, Playful, Contemplative, Excited, Chill, Energetic, etc.)
    2. Personality trait (Creative, Technical, Social, Adventurous, Thoughtful, Mystical, etc.)
    3. Two complementary colors in hex format that match their vibe:
       - If angry/intense: jarring contrasting colors
       - If calm/chill: harmonious complementary colors
       - If they mention specific color preferences in posts, use those
       - Consider their personality (creative = vibrant, technical = cool tones, mystical = purples/blues, etc.)
    4. Base frequency (0.001 to 0.05) for wave patterns:
       - Calm/contemplative people: lower frequency (0.005-0.015) = slower, gentler waves
       - Energetic/excited people: higher frequency (0.025-0.045) = faster, chaotic waves
       - Balanced: medium frequency (0.015-0.025)

    Format as JSON:
    {
      "mood": "mood description",
      "personality": "personality trait",
      "color1": "#hexcode",
      "color2": "#hexcode",
      "baseFrequency": 0.02,
      "reasoning": "Brief explanation of why you chose these values"
    }
    `;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that analyzes social media presence and returns JSON responses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const data = await openAIResponse.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      mood: 'Neutral',
      personality: 'Balanced',
      color1: '#4ade80',
      color2: '#22d3ee',
      baseFrequency: 0.02,
      reasoning: 'Default values'
    };

    return NextResponse.json({
      mood: analysis.mood || 'Neutral',
      personality: analysis.personality || 'Balanced',
      color1: analysis.color1 || '#4ade80',
      color2: analysis.color2 || '#22d3ee',
      baseFrequency: analysis.baseFrequency || 0.02,
      reasoning: analysis.reasoning || '',
      postsAnalyzed: casts.length
    });
  } catch (error: any) {
    console.error('Error in Farcaster mood API:', error);
    return NextResponse.json({
      error: 'Failed to fetch Farcaster mood',
      details: error.message
    }, { status: 500 });
  }
}
