import { NextRequest, NextResponse } from 'next/server';
import { getQueue } from '@/app/services/queue';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  const queue = getQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const state = await job.getState();
  const progress = job.progress;

  if (state === 'completed') {
    const result = job.returnvalue;
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
}

