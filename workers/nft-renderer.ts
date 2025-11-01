import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
// TODO: Install canvas library on Linux server (doesn't build on Windows)
// import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import GIF from 'gif.js';
import { uploadToIPFS } from '../app/services/ipfs.js';

interface RenderJobData {
  settings: {
    flowField: {
      enabled: boolean;
      baseFrequency: number;
      amplitude: number;
      octaves: number;
      color1: string;
      color2: string;
      rotation: number;
      direction: number;
    };
    flowFields: {
      enabled: boolean;
      baseFrequency: number;
      amplitude: number;
      octaves: number;
      lineLength: number;
      lineDensity: number;
      rotation: number;
      direction: number;
    };
    contour: {
      enabled: boolean;
      baseFrequency: number;
      amplitude: number;
      octaves: number;
      levels: number;
      smoothness: number;
    };
    contourAffectsFlow: boolean;
  };
  userId: string;
  walletAddress: string;
}

const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const worker = new Worker('nft-render', async (job: Job<RenderJobData>) => {
  console.log(`Processing job ${job.id} for user ${job.data.walletAddress}`);

  const { settings } = job.data;

  // Step 1: Render GIF server-side
  const gifBuffer = await renderGIF(settings);

  // Update progress
  await job.updateProgress(33);

  // Step 2: Upload GIF to IPFS
  const gifCid = await uploadToIPFS(gifBuffer, 'image/gif', 'gen1-animation.gif');
  const imageUrl = `ipfs://${gifCid}`;

  await job.updateProgress(66);

  // Step 3: Upload metadata to IPFS
  const metadata = {
    name: `Gen1 NFT #${Date.now()}`,
    description: 'Generative Gen1 NFT',
    image: imageUrl,
    animation_url: imageUrl,
    attributes: settings,
  };

  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const metadataCid = await uploadToIPFS(metadataBuffer, 'application/json', 'metadata.json');
  const metadataUrl = `ipfs://${metadataCid}`;

  await job.updateProgress(100);

  return {
    imageUrl,
    metadataUrl,
    gifCid,
    metadataCid,
  };
}, {
  connection,
  concurrency: 3, // Process 3 jobs at once (adjust based on server RAM)
});

// Server-side GIF rendering function
async function renderGIF(settings: any): Promise<Buffer> {
  // TODO: Complete implementation on Linux server
  // Install canvas: npm install canvas
  // Install FFmpeg: sudo apt install ffmpeg
  // See SCALING_ARCHITECTURE.md and WORKER_QUEUE_TODO.md for full implementation guide

  console.log('⚠️  GIF encoding not yet implemented.');
  console.log('📝 TODO: Install canvas library and FFmpeg on Linux server');
  console.log('📝 TODO: Implement GIF encoding with multi-frame rendering');
  console.log('📝 See: SCALING_ARCHITECTURE.md for implementation details');

  // Return placeholder for now
  return Buffer.alloc(100);
};

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

export default worker;

