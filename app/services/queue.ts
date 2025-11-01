import { Queue } from 'bullmq';
import Redis from 'ioredis';

let connection: Redis | null = null;
let nftRenderQueue: Queue | null = null;

function getConnection() {
  if (!connection) {
    connection = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      lazyConnect: true, // Don't connect immediately
    });
  }
  return connection;
}

export function getQueue() {
  if (!nftRenderQueue) {
    nftRenderQueue = new Queue('nft-render', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    });
  }
  return nftRenderQueue;
}

