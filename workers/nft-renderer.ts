import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { uploadToIPFS } from '../app/services/ipfs.js';
import { createRequire } from 'module';

// Use createRequire to import CommonJS module (gif.js exports as default)
const require = createRequire(import.meta.url);
const GIFModule = require('gif.js');
// gif.js exports the constructor as default or as the module itself
const GIF = GIFModule.default || GIFModule.GIF || GIFModule;

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

  // Try to use server-side rendering with optional canvas package
  let gifBuffer: Buffer;
  try {
    // Dynamic import for optional canvas dependency
    const { createCanvas } = await import('canvas');

    // Step 1: Render GIF server-side
    gifBuffer = await renderGIF(settings, createCanvas);
    await job.updateProgress(33);
  } catch (error: any) {
    console.error('⚠️ Server-side rendering failed (canvas not installed?):', error.message);
    throw new Error('Server-side rendering requires canvas package. Install on Linux server with: npm install canvas');
  }

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
    videoUrl: imageUrl, // For now, use GIF as video (MP4 generation can be added later)
    metadataUrl,
    gifCid,
    metadataCid,
  };
}, {
  connection,
  concurrency: 3,
});

// Server-side GIF rendering functions
function getFlowFieldWavefieldValue(x: number, y: number, t: number, settings: any): number {
  let value = 0;
  for (let octave = 0; octave < settings.flowField.octaves; octave++) {
    const freq = settings.flowField.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.flowField.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

function getFlowFieldsWavefieldValue(x: number, y: number, t: number, settings: any): number {
  let value = 0;
  for (let octave = 0; octave < settings.flowFields.octaves; octave++) {
    const freq = settings.flowFields.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.flowFields.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

function getContourWavefieldValue(x: number, y: number, t: number, settings: any): number {
  let value = 0;
  for (let octave = 0; octave < settings.contour.octaves; octave++) {
    const freq = settings.contour.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.contour.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

function renderFlowField(ctx: any, size: number, t: number, settings: any) {
  if (!settings.flowField.enabled) return;

  const angle = (t / 100) * settings.flowField.direction;
  const x0 = size / 2 + Math.cos(angle) * size;
  const y0 = size / 2 + Math.sin(angle) * size;
  const x1 = size / 2 - Math.cos(angle) * size;
  const y1 = size / 2 - Math.sin(angle) * size;

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, settings.flowField.color1);
  gradient.addColorStop(1, settings.flowField.color2);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function renderFlowFields(ctx: any, size: number, t: number, settings: any) {
  if (!settings.flowFields.enabled) return;

  const gridSize = Math.floor(size * settings.flowFields.lineDensity);
  const cellSize = size / gridSize;
  const rotationRad = (settings.flowFields.rotation * Math.PI) / 180;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;

  for (let py = 0; py < gridSize; py++) {
    for (let px = 0; px < gridSize; px++) {
      const x = px * cellSize;
      const y = py * cellSize;
      const eps = 1;
      let gradX, gradY;

      if (settings.contourAffectsFlow && settings.contour.enabled) {
        const contourValue = getContourWavefieldValue(x, y, t, settings);
        gradX = getContourWavefieldValue(x + eps, y, t, settings) - contourValue;
        gradY = getContourWavefieldValue(x, y + eps, t, settings) - contourValue;

        const flowFieldsValue = getFlowFieldsWavefieldValue(x, y, t, settings);
        const flowFieldsGradX = getFlowFieldsWavefieldValue(x + eps, y, t, settings) - flowFieldsValue;
        const flowFieldsGradY = getFlowFieldsWavefieldValue(x, y + eps, t, settings) - flowFieldsValue;

        gradX = (gradX + flowFieldsGradX) / 2;
        gradY = (gradY + flowFieldsGradY) / 2;
      } else {
        const flowFieldsValue = getFlowFieldsWavefieldValue(x, y, t, settings);
        gradX = getFlowFieldsWavefieldValue(x + eps, y, t, settings) - flowFieldsValue;
        gradY = getFlowFieldsWavefieldValue(x, y + eps, t, settings) - flowFieldsValue;
      }

      const length = Math.sqrt(gradX * gradX + gradY * gradY);
      if (length > 0) {
        let dirX = gradX / length;
        let dirY = gradY / length;

        const rotatedDirX = dirX * Math.cos(rotationRad) - dirY * Math.sin(rotationRad);
        const rotatedDirY = dirX * Math.sin(rotationRad) + dirY * Math.cos(rotationRad);

        const finalDirX = rotatedDirX * settings.flowFields.direction;
        const finalDirY = rotatedDirY * Math.abs(settings.flowFields.direction);

        const startX = x + cellSize / 2;
        const startY = y + cellSize / 2;
        const endX = startX + finalDirX * settings.flowFields.lineLength;
        const endY = startY + finalDirY * settings.flowFields.lineLength;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
  }
}

function renderContourMapping(ctx: any, size: number, t: number, settings: any) {
  if (!settings.contour.enabled) return;

  const gridSize = 64;
  const cellSize = size / gridSize;
  const levels: number[] = [];
  for (let i = 0; i < settings.contour.levels; i++) {
    levels.push((i / settings.contour.levels) * 2 - 1);
  }

  levels.forEach((level, levelIndex) => {
    const alpha = (levelIndex + 1) / settings.contour.levels * 0.3;
    ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;

    for (let py = 0; py < gridSize; py++) {
      for (let px = 0; px < gridSize; px++) {
        const x = px * cellSize;
        const y = py * cellSize;
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const waveValue = getContourWavefieldValue(centerX, centerY, t, settings);

        const nextLevel = levelIndex < levels.length - 1 ? levels[levelIndex + 1] : 1;
        if (waveValue >= level && waveValue < nextLevel) {
          let smoothFactor = 1;
          if (settings.contour.smoothness > 0) {
            const neighborValues = [
              getContourWavefieldValue(centerX - cellSize, centerY, t, settings),
              getContourWavefieldValue(centerX + cellSize, centerY, t, settings),
              getContourWavefieldValue(centerX, centerY - cellSize, t, settings),
              getContourWavefieldValue(centerX, centerY + cellSize, t, settings)
            ];
            const avgNeighbor = neighborValues.reduce((a, b) => a + b, 0) / neighborValues.length;
            smoothFactor = Math.abs(waveValue - avgNeighbor) < settings.contour.smoothness ? 1 : 0.3;
          }
          ctx.globalAlpha = alpha * smoothFactor;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
  });

  ctx.globalAlpha = 1;
}

// Server-side GIF rendering function
async function renderGIF(settings: any, createCanvas: any): Promise<Buffer> {
  const size = 512;
  const totalFrames = 1000;

  const tempCanvas = createCanvas(size, size);
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    throw new Error('Failed to get canvas context');
  }

  console.log(`Rendering ${totalFrames} frames...`);

  // Create GIF using GIF.js
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: size,
    height: size,
  } as any);

  // Render frames and add to GIF
  for (let frame = 0; frame < totalFrames; frame++) {
    tempCtx.clearRect(0, 0, size, size);

    const t = (frame / totalFrames) * 200;

    renderFlowField(tempCtx, size, t, settings);
    renderFlowFields(tempCtx, size, t, settings);
    renderContourMapping(tempCtx, size, t, settings);

    // Add frame to GIF
    gif.addFrame(tempCanvas, { delay: 1000 / 30 });
  }

  console.log('Encoding GIF...');

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      console.log('GIF encoding complete');
      resolve(Buffer.from(blob as any));
    });
    gif.on('error', (error: any) => {
      console.error('GIF encoding error:', error);
      reject(error);
    });
    gif.render();
  });
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

export default worker;
