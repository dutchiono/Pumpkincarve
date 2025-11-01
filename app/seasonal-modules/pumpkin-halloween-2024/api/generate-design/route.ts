import { AIService } from '@/app/services/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { posts, pfp, username, bio } = await request.json();

    // Allow generation even with 0 posts - will use bio and pfp only
    const aiService = new AIService();
    const design = await aiService.generatePumpkinDesign({
      posts: posts || [],
      pfp: pfp || '',
      username: username || '',
      bio: bio || '',
    });

    return NextResponse.json(design);
  } catch (error: any) {
    console.error('Error generating AI design:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI design' },
      { status: 500 }
    );
  }
}
