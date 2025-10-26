/**
 * Gen3 Data Analyzer
 *
 * Analyzes holder data and generates modified settings for NFT evolution
 */

import { AIService } from './ai';
import { NeynarService } from './neynar';

export interface HolderData {
  address: string;
  farcasterId?: string;
  posts: any[];
  postFrequency: number; // Posts per day
  mood: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore10: number; // Last 10 posts sentiment (-1 to 1)
  sentimentScore100: number; // Last 100 posts sentiment (-1 to 1)
  tokenCount: number;
}

export interface ModifiedSettings {
  flowField: {
    color1: string;
    color2: string;
    amplitude: number;
  };
  flowFields: {
    baseFreq: number;
    lineDensity: number;
  };
  contour: {
    levels: number;
    smoothness: number;
  };
}

export class Gen3DataAnalyzer {
  private aiService: AIService;
  private neynarService: NeynarService;

  constructor() {
    this.aiService = new AIService();
    this.neynarService = new NeynarService();
  }

  /**
   * Fetch and analyze holder data
   */
  async analyzeHolder(holderAddress: string): Promise<HolderData> {
    // Get Farcaster data
    let posts: any[] = [];
    let farcasterId: string | undefined;

    try {
      const userData = await this.neynarService.getUserData(holderAddress);
      posts = userData.posts;
      farcasterId = userData.username;
    } catch (error) {
      console.log(`No Farcaster data for ${holderAddress}`);
    }

    // Analyze posts
    const last10Posts = posts.slice(0, 10);
    const last100Posts = posts.slice(0, 100);

    const sentiment10 = this.analyzeSentiment(last10Posts);
    const sentiment100 = this.analyzeSentiment(last100Posts);
    const mood = this.determineMood(sentiment10, sentiment100);

    // Calculate post frequency (posts per day)
    const postFrequency = this.calculatePostFrequency(posts);

    // Get token count (placeholder - implement with your contract)
    const tokenCount = 0; // TODO: Fetch from contract

    return {
      address: holderAddress,
      farcasterId,
      posts,
      postFrequency,
      mood,
      sentimentScore10: sentiment10,
      sentimentScore100: sentiment100,
      tokenCount,
    };
  }

  /**
   * Use AI to determine personality-appropriate colors
   */
  async generateColorsWithAI(posts: any[], bio: string = ''): Promise<{ color1: string; color2: string }> {
    if (posts.length === 0) {
      return { color1: '#4ade80', color2: '#22d3ee' }; // Default
    }

    try {
      // Use the existing AI analysis
      const analysis = await (this.aiService as any).analyzeUserPosts(posts, '', bio);

      // Map personality/mood to colors using AI
      const colorPrompt = `
        Based on this personality analysis, suggest two hex colors for a NFT:

        Personality: ${analysis.personality || 'balanced'}
        Mood: ${analysis.mood || 'neutral'}
        Interests: ${analysis.interests?.join(', ') || 'various'}

        Return JSON with color1 and color2 as hex codes (e.g., "#FF5733").
        Choose colors that represent this person's energy and personality.
        First color should be more vibrant/dominant, second should complement.

        Example outputs:
        - Creative/Artistic: color1="#9D4EDD" (purple), color2="#E0AAFF" (light purple)
        - Technical: color1="#023E8A" (deep blue), color2="#00B4D8" (cyan)
        - Adventurous: color1="#FF6B35" (orange), color2="#FFB627" (yellow)
        - Mystical: color1="#4A0E4E" (deep purple), color2="#C5E1A5" (sage green)
        - Playful: color1="#FF006E" (pink), color2="#FFBE0B" (yellow)
        - Neutral/Balanced: color1="#4ade80" (green), color2="#22d3ee" (cyan)

        JSON only:
      `;

      // Call OpenAI to generate colors
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You return only valid JSON with color1 and color2 hex codes.' },
            { role: 'user', content: colorPrompt }
          ],
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Extract JSON
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating colors with AI:', error);
    }

    // Fallback to sentiment-based colors
    return this.sentimentToColors(
      this.analyzeSentiment(posts.slice(0, 10)),
      this.analyzeSentiment(posts.slice(0, 100))
    );
  }

  /**
   * Modify base settings based on holder data
   */
  async modifySettings(baseSettings: any, holderData: HolderData): Promise<ModifiedSettings> {
    const modified = JSON.parse(JSON.stringify(baseSettings));

    // 1. Set colors based on mood/sentiment
    if (holderData.sentimentScore10 !== null && holderData.sentimentScore100 !== null) {
      // Use AI to generate personalized colors
      const colors = await this.generateColorsWithAI(holderData.posts);
      modified.flowField.color1 = colors.color1;
      modified.flowField.color2 = colors.color2;
    } else {
      // Fallback to sentiment-based
      modified.flowField.color1 = this.sentimentToColor(holderData.sentimentScore10);
      modified.flowField.color2 = this.sentimentToColor(holderData.sentimentScore100);
    }

    // 2. Modify FlowFields base frequency based on post frequency
    // More active users → higher frequency → more dynamic flow
    const frequencyMultiplier = Math.max(0.5, Math.min(2.0, 1 + holderData.postFrequency / 10));
    modified.flowFields.baseFreq = baseSettings.flowFields.baseFreq * frequencyMultiplier;

    // 3. Adjust line density based on activity
    const densityBonus = Math.min(0.2, holderData.postFrequency * 0.01);
    modified.flowFields.lineDensity = baseSettings.flowFields.lineDensity + densityBonus;

    // 4. Adjust contour levels based on token count
    if (holderData.tokenCount > 0) {
      modified.contour.levels = Math.min(10, Math.max(3, 3 + Math.floor(holderData.tokenCount / 5)));
    }

    return modified;
  }

  // Helper functions
  private analyzeSentiment(posts: any[]): number {
    if (posts.length === 0) return 0;

    const texts = posts.map(p => p.text?.toLowerCase() || '');
    let positive = 0;
    let negative = 0;

    texts.forEach(text => {
      if (text.includes('happy') || text.includes('great') || text.includes('love') ||
          text.includes('excited') || text.includes('amazing')) positive++;
      if (text.includes('sad') || text.includes('bad') || text.includes('hate') ||
          text.includes('angry') || text.includes('terrible')) negative++;
    });

    // Return sentiment from -1 (negative) to 1 (positive)
    if (positive + negative === 0) return 0;
    return (positive - negative) / (positive + negative);
  }

  private determineMood(score10: number, score100: number): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const avg = (score10 + score100) / 2;
    if (avg > 0.3) return 'positive';
    if (avg < -0.3) return 'negative';
    if (Math.abs(score10 - score100) > 0.5) return 'mixed';
    return 'neutral';
  }

  private calculatePostFrequency(posts: any[]): number {
    if (posts.length < 2) return 0;

    const now = Date.now() / 1000;
    const oldestPost = posts[posts.length - 1]?.timestamp || now;
    const daysSinceOldest = (now - oldestPost) / (60 * 60 * 24);

    if (daysSinceOldest < 1) return posts.length; // Less than 1 day
    return posts.length / daysSinceOldest;
  }

  private sentimentToColors(score10: number, score100: number): { color1: string; color2: string } {
    return {
      color1: this.sentimentToColor(score10),
      color2: this.sentimentToColor(score100),
    };
  }

  private sentimentToColor(sentiment: number): string {
    // Convert sentiment (-1 to 1) to a color
    // Positive = warm colors, Negative = cool colors, Neutral = mid tones
    const normalized = (sentiment + 1) / 2; // 0 to 1

    if (normalized > 0.66) {
      // Happy - warm colors (orange, yellow)
      const hue = Math.floor(20 + normalized * 40);
      return `#FF${Math.floor(100 + normalized * 100).toString(16).padStart(2, '0')}${Math.floor(50).toString(16).padStart(2, '0')}`;
    } else if (normalized > 0.33) {
      // Neutral - balanced (green, teal)
      const value = Math.floor(100 + normalized * 100);
      return `#${value.toString(16).padStart(2, '0')}DC${value.toString(16).padStart(2, '0')}`;
    } else {
      // Sad - cool colors (blue, purple)
      return `#00${Math.floor(80 + normalized * 150).toString(16).padStart(2, '0')}${Math.floor(150 + normalized * 100).toString(16).padStart(2, '0')}`;
    }
  }
}

export default Gen3DataAnalyzer;

