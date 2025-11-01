
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Neynar client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const neynarClient = NEYNAR_API_KEY ? new NeynarAPIClient({ apiKey: NEYNAR_API_KEY }) : null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Farcaster User ID is required' }, { status: 400 });
    }

    if (!neynarClient) {
      return NextResponse.json({ error: 'Neynar API Key not configured' }, { status: 500 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    // Try to get user - userId can be FID or username
    let fid: number | null = null;

    // Check if userId is a number (FID)
    if (!isNaN(Number(userId))) {
      fid = Number(userId);
    } else {
      // Try username lookup
      try {
        const userResponse = await neynarClient.lookupUserByUsername(userId);
        // @ts-ignore - SDK types may be incomplete
        if (userResponse && userResponse.fid) {
          // @ts-ignore
          fid = userResponse.fid;
        }
      } catch (e) {
        // Username lookup failed, continue
      }
    }

    if (!fid) {
      return NextResponse.json({ error: 'Farcaster user not found' }, { status: 404 });
    }

    const castsResponse = await neynarClient.fetchCastsForUser({ fid, limit: 100 });
    const casts = castsResponse?.casts || [];
    const postsAnalyzed = casts.length;

    if (postsAnalyzed === 0) {
      return NextResponse.json({
        mood: 'neutral',
        personality: 'Unknown',
        reasoning: 'No posts found to analyze',
        postsAnalyzed: 0,
        color1: '#4ade80',
        color2: '#22d3ee',
        baseFrequency: 0.02,
      });
    }

    // Prepare posts text for AI analysis
    const postTexts = casts
      .map((cast: any) => cast.text || '')
      .filter((text: string) => text.length > 0)
      .slice(0, 100)
      .join('\n\n');

    // Call OpenAI GPT-4o-mini for AI sentiment analysis
    const analysisPrompt = `
Analyze the following Farcaster user's recent posts to understand their personality and mood:

USERNAME: @${userId}

RECENT POSTS (${postsAnalyzed} total):
${postTexts}

Please provide insights in JSON format:
{
  "mood": "happy|sad|neutral|mixed|energetic|contemplative",
  "personality": "Creative|Technical|Social|Adventurous|Thoughtful|Mystical|Balanced",
  "traits": ["trait1", "trait2", "trait3"],
  "interests": ["interest1", "interest2", "interest3"],
  "reasoning": "Brief 2-sentence explanation of the analysis",
  "color1": "#HEXCODE (dominant color representing energy)",
  "color2": "#HEXCODE (complementary color)",
  "baseFrequency": 0.015 (recommended NFT animation frequency, 0.01-0.03)
}

Guidelines:
- mood: Overall emotional tone from posts
- personality: Dominant personality archetype
- traits: 3 key personality characteristics
- interests: Top 3 topics/themes discussed
- reasoning: Explain your analysis briefly
- color1/color2: Hex colors that represent this person's energy (be creative, avoid generic colors)
- baseFrequency: Animation frequency reflecting activity level (lower=calmer, higher=more energetic)

Return ONLY valid JSON, no markdown formatting or additional text.
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
      };
    }

    return NextResponse.json({
      mood: analysis.mood || 'neutral',
      personality: analysis.personality || 'Balanced',
      traits: analysis.traits || [],
      interests: analysis.interests || [],
      reasoning: analysis.reasoning || 'Analysis completed',
      postsAnalyzed,
      color1: analysis.color1 || '#4ade80',
      color2: analysis.color2 || '#22d3ee',
      baseFrequency: analysis.baseFrequency || 0.02,
    });
  } catch (error) {
    console.error('Error in Farcaster mood API:', error);
    return NextResponse.json({ error: 'Failed to fetch Farcaster mood' }, { status: 500 });
  }
}

