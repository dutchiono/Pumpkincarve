import { NextRequest, NextResponse } from 'next/server';
import { waitForQueueReady } from '@/app/services/queue';

export async function POST(request: NextRequest) {
  try {
    const { settings, walletAddress } = await request.json();

    const queue = await waitForQueueReady();
    const job = await queue.add('nft-render', {
      settings,
      walletAddress,
      userId: walletAddress, // Or from auth
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Rendering queued. Check status at /api/gen1/job-status?jobId=' + job.id
    });

  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to queue job';
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      error?.code === 'ECONNREFUSED';

    return NextResponse.json(
      {
        error: isConnectionError
          ? 'Rendering queue is not available. Check Redis connection and worker status.'
          : errorMessage,
      },
      { status: isConnectionError ? 503 : 500 },
    );
  }
}

