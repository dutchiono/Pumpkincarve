import { NextRequest, NextResponse } from 'next/server';
import { waitForQueueReady } from '@/app/services/queue';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  try {
    const queue = await waitForQueueReady();
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === 'completed') {
      const result = job.returnvalue || {};
      return NextResponse.json({
        status: 'completed',
        result: {
          imageUrl: result.imageUrl,
          metadataUrl: result.metadataUrl,
        }
      });
    }

    return NextResponse.json({
      status: state, // 'waiting', 'active', 'completed', 'failed'
      progress,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to fetch job status';
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

