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
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match && match[1].trim() === key) {
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch (error) {
    console.error(`[Password Check API] Error reading .env file:`, error);
  }

  return process.env[key];
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    console.log('[Password Check API] Received password check request');

    if (!password) {
      console.error('[Password Check API] No password provided');
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Check password
    const MOOD_ANALYSIS_PASSWORD = getEnvVar('MOOD_ANALYSIS_PASSWORD');
    console.log('[Password Check API] MOOD_ANALYSIS_PASSWORD configured:', !!MOOD_ANALYSIS_PASSWORD);

    if (!MOOD_ANALYSIS_PASSWORD || MOOD_ANALYSIS_PASSWORD.trim() === '') {
      console.error('[Password Check API] MOOD_ANALYSIS_PASSWORD not configured in .env file');
      return NextResponse.json({
        error: 'Password protection is not configured. Please set MOOD_ANALYSIS_PASSWORD in your .env file.'
      }, { status: 503 });
    }

    const passwordMatch = password === MOOD_ANALYSIS_PASSWORD.trim();
    console.log('[Password Check API] Password match:', passwordMatch);

    if (!passwordMatch) {
      console.error('[Password Check API] Invalid password attempt');
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    console.log('[Password Check API] Password check successful');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Password Check API] Error:', error);
    return NextResponse.json({
      error: 'Failed to check password',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

