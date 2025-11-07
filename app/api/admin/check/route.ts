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
    console.error(`[Admin Check API] Error reading .env file:`, error);
  }

  return process.env[key];
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const REAL_WALLET = getEnvVar('REAL_WALLET');

    if (!REAL_WALLET || REAL_WALLET.trim() === '' || REAL_WALLET === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        isAdmin: false,
        error: 'REAL_WALLET not configured'
      });
    }

    const isAdmin = address.toLowerCase() === REAL_WALLET.toLowerCase().trim();

    return NextResponse.json({ isAdmin });
  } catch (error: any) {
    console.error('[Admin Check API] Error:', error);
    return NextResponse.json({
      isAdmin: false,
      error: 'Failed to check admin status',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

