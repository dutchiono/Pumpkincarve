// Using OpenAI for all AI operations
// Install with: npm install openai

export class AIService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';

    if (!this.openaiApiKey) {
      console.warn('OPENAI_API_KEY not found. Get one from https://platform.openai.com/api-keys');
    }
  }

  async generatePumpkinDesign(userData: {
    posts: any[];
    pfp: string;
    username: string;
    bio: string;
  }): Promise<{
    theme: string;
    description: string;
    imageUrl: string;
    thoughtProcess: string;
    personalityAnalysis: any;
  }> {
    try {
      // Analyze user's posts to understand their personality and interests
      const analysis = await this.analyzeUserPosts(userData.posts, userData.pfp, userData.bio);

      // Generate pumpkin carving theme based on analysis
      const theme = await this.generateTheme(analysis, userData.username);

      // Generate detailed description
      const description = await this.generateDescription(theme, analysis);

      // Generate thought process
      const thoughtProcess = await this.generateThoughtProcess(analysis, userData.username);

      // Generate image - but only if explicitly requested
      // We'll call this separately via a new endpoint

      return {
        theme,
        description,
        imageUrl: '', // Will be generated separately
        thoughtProcess,
        personalityAnalysis: analysis,
      };
    } catch (error) {
      console.error('Error generating pumpkin design:', error);
      throw error;
    }
  }

  async generatePumpkinImage(theme: string, description: string): Promise<string> {
    try {
      return await this.generateImage(theme, description);
    } catch (error) {
      console.error('Error generating pumpkin image:', error);
      throw error;
    }
  }

  private async callOpenAI(messages: any[], model: string = 'gpt-4o-mini'): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async analyzeUserPosts(posts: any[], pfp: string, bio: string): Promise<{
    themes: string[];
    interests: string[];
    personality: string;
    mood: string;
  }> {
    const postTexts = posts
      .map(post => post.text || '')
      .filter(text => text.length > 0)
      .slice(0, 100)
      .join('\n\n');

    const prompt = `
    Analyze the following user's social media presence to understand their personality:

    BIO: "${bio || 'No bio provided'}"

    RECENT POSTS (${posts.length} total):
    ${postTexts}

    PROFILE PICTURE: The user's profile picture URL is: ${pfp}
    (Consider: Does this reveal anything about their aesthetic preferences, interests, or personality?)

    Please provide insights:
    1. Top 3 themes/topics they discuss
    2. Top 3 interests/hobbies
    3. Personality trait (Creative, Technical, Social, Adventurous, Thoughtful, Mystical, etc.)
    4. Overall mood/energy (Positive, Neutral, Mysterious, Playful, Contemplative, etc.)

    Format as JSON:
    {
      "themes": ["theme1", "theme2", "theme3"],
      "interests": ["interest1", "interest2", "interest3"],
      "personality": "trait",
      "mood": "mood"
    }
    `;

    const response = await this.callOpenAI([
      { role: 'system', content: 'You are a helpful AI assistant that analyzes social media presence and returns JSON responses.' },
      { role: 'user', content: prompt }
    ]);

    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { themes: [], interests: [], personality: 'Balanced', mood: 'Neutral' };
    return analysis;
  }

  private async generateTheme(analysis: any, username: string): Promise<string> {
    const prompt = `
    Based on this user analysis, create a unique pumpkin carving theme:

    User: @${username}
    Themes: ${analysis.themes?.join(', ') || 'General'}
    Interests: ${analysis.interests?.join(', ') || 'Various'}
    Personality: ${analysis.personality || 'Balanced'}
    Mood: ${analysis.mood || 'Neutral'}

    Create a creative pumpkin carving theme that reflects their personality and interests.
    Examples: "Cyberpunk Samurai", "Nature's Symphony", "Retro Gaming Nostalgia", "Mystical Forest Guardian"

    Return just the theme name (max 3 words):
    `;

    const response = await this.callOpenAI([
      { role: 'system', content: 'You are a creative AI assistant that generates unique pumpkin carving themes.' },
      { role: 'user', content: prompt }
    ]);

    return response.trim() || 'Personalized Pumpkin';
  }

  private async generateThoughtProcess(analysis: any, username: string): Promise<string> {
    const prompt = `
    Create a thoughtful analysis of this user's personality based on their social media presence:

    Username: @${username}
    Themes: ${analysis.themes?.join(', ') || 'Various'}
    Interests: ${analysis.interests?.join(', ') || 'Diverse'}
    Personality: ${analysis.personality || 'Balanced'}
    Mood: ${analysis.mood || 'Neutral'}

    Write a brief (2-3 sentences) "thought process" that explains:
    1. What stands out about this person's personality
    2. What inspired the pumpkin design theme
    3. How their interests/posts informed the creative direction

    Make it conversational and insightful, like you're explaining your creative process to a friend.
    `;

    const response = await this.callOpenAI([
      { role: 'system', content: 'You are a thoughtful AI assistant that explains creative decisions in a conversational way.' },
      { role: 'user', content: prompt }
    ]);

    return response.trim();
  }

  private async generateDescription(theme: string, analysis: any): Promise<string> {
    const prompt = `
    Create a detailed description for a JACK-O'-LANTERN PUMPKIN CARVING with the theme: "${theme}"

    User personality: ${analysis.personality || 'Balanced'}
    User mood: ${analysis.mood || 'Neutral'}
    User interests: ${analysis.interests?.join(', ') || 'Various'}

    CRITICAL REQUIREMENTS:
    - This MUST be a jack-o'-lantern (pumpkin with a carved face)
    - Start with: "A classic jack-o'-lantern pumpkin with..."
    - The pumpkin must have a carved FACE with eyes, nose, and mouth
    - Add decorative elements inspired by the theme around the face
    - Keep the pumpkin shape and face as the foundation
    - All carving must be done on the pumpkin's surface (cut-out shapes)
    - Connect decorative elements to the user's personality/interests
    - Be 2-3 sentences long
    - Example: "A classic jack-o'-lantern pumpkin with a traditional triangular eye pattern, but the mouth is carved into interlocking gears with a circuit board border along the edges, reflecting a tech-savvy personality."

    Description:
    `;

    const response = await this.callOpenAI([
      { role: 'system', content: 'You are a creative AI assistant that writes detailed descriptions of pumpkin carvings.' },
      { role: 'user', content: prompt }
    ]);

    return response.trim() || 'A unique pumpkin carving design tailored to your personality.';
  }

  private async generateImage(theme: string, description: string): Promise<string> {
    try {
      // Use OpenAI DALL-E 3 for image generation
      // Pricing: $0.040 per image (1024x1024)
      const apiKey = process.env.OPENAI_API_KEY || '';

      if (!apiKey) {
        console.error('OpenAI API key not found');
        return '';
      }

      const prompt = `
      Create a JACK-O'-LANTERN PUMPKIN CARVING ILLUSTRATION for the theme: "${theme}"

      REQUIRED ELEMENTS:
      - Must be a classic jack-o'-lantern pumpkin with a carved face (eyes, nose, mouth)
      - The pumpkin must be the full subject with its characteristic rounded orange shape
      - Add theme-inspired decorative elements that enhance but don't replace the face
      - Include the pumpkin's stem at the top
      - Make sure it looks like a real carved pumpkin that could exist

      Description: ${description}

      Style: Line art or realistic illustration of an actual carved pumpkin
      - Show the pumpkin in its natural orange color
      - Carved-out areas (face and decorations) should reveal the dark interior
      - Include shadows and depth to make it look three-dimensional
      - Keep the design recognizable as a traditional jack-o'-lantern pumpkin
      `;

      // Call OpenAI DALL-E 3 API (CHEAPEST MODEL) with retry logic
      let lastError: any = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🖼️  Attempting OpenAI image generation (attempt ${attempt}/${maxRetries})...`);

          const response = await fetch(
            'https://api.openai.com/v1/images/generations',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1, // ONLY ONE IMAGE
                size: '1024x1024',
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            // Extract image URL from response
            if (data.data && data.data.length > 0 && data.data[0].url) {
              console.log('✅ OpenAI image generated successfully');
              return data.data[0].url;
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ OpenAI API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);
            lastError = new Error(`OpenAI API error: ${response.status} - ${errorText}`);

            // If it's a 500 error and we have retries left, wait and retry
            if (response.status === 500 && attempt < maxRetries) {
              const waitTime = attempt * 2000; // 2s, 4s, 6s
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
        } catch (fetchError: any) {
          console.error(`❌ Fetch error (attempt ${attempt}/${maxRetries}):`, fetchError);
          lastError = fetchError;
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // If we get here, all retries failed
      console.error('❌ All retry attempts failed');
      throw lastError || new Error('Failed to generate image after retries');
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}
