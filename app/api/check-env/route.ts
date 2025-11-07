import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Security: Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const neynarKey = process.env.NEYNAR_API_KEY || '';

  // Find all env files that might exist
  const envFiles = [];
  try {
    const fs = await import('fs');
    const path = await import('path');
    const files = ['.env', '.env.local', '.env.development', '.env.production'];
    for (const file of files) {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        envFiles.push(file);
      }
    }
  } catch (e) {
    // Ignore
  }

  return NextResponse.json({
    loadedKey: {
      exists: !!neynarKey,
      length: neynarKey.length,
      first8: neynarKey.substring(0, 8),
      last8: neynarKey.length > 8 ? neynarKey.substring(neynarKey.length - 8) : '',
      fullValue: neynarKey, // Show full key for verification
    },
    envFilesFound: envFiles,
    nodeEnv: process.env.NODE_ENV,
    allNeynarEnvVars: Object.keys(process.env).filter(k => k.includes('NEYNAR')),
    note: 'Compare the loadedKey.fullValue with what you have in your .env file. If different, check .env.local or system environment variables.',
  });
}

