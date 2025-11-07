import { Queue, type QueueOptions } from 'bullmq';
import { getRedisConnection } from './redis';

let nftRenderQueue: Queue | null = null;

export function getQueue() {
  if (!nftRenderQueue) {
    const queueOptions: QueueOptions = {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    };

    nftRenderQueue = new Queue('nft-render', queueOptions);
    nftRenderQueue.on('error', (error) => {
      console.error('[Queue] nft-render error', error);
    });
  }

  return nftRenderQueue;
}

export async function waitForQueueReady() {
  const queue = getQueue();
  try {
    await queue.waitUntilReady();
  } catch (error) {
    console.error('[Queue] waitUntilReady failed', error);
    throw error;
  }
  return queue;
}

