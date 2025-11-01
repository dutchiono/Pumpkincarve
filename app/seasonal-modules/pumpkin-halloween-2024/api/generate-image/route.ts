import { AIService } from '@/app/services/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { theme, description } = await request.json();

    if (!theme || !description) {
      return NextResponse.json({ error: 'Theme and description are required' }, { status: 400 });
    }

    const aiService = new AIService();
    const imageUrl = await aiService.generatePumpkinImage(theme, description);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating pumpkin image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate pumpkin image' },
      { status: 500 }
    );
  }
}
