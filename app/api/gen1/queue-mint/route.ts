import { NextRequest, NextResponse } from 'next/server';
import { getQueue } from '@/app/services/queue';

export async function POST(request: NextRequest) {
  try {
    const { settings, walletAddress } = await request.json();

    // Add job to queue
    const queue = getQueue();
    const job = await queue.add('render-nft', {
      settings,
      walletAddress,
      userId: walletAddress, // Or from auth
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Rendering queued. Check status at /api/gen1/job-status?jobId=' + job.id
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

