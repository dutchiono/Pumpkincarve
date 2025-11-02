import GIF from 'gif.js';
import { Buffer } from 'buffer';

export interface Gen1Settings {
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
}

// Default settings for perfect looping animations
export const defaultGen1Settings: Gen1Settings = {
  flowField: {
    enabled: true,
    baseFrequency: 0.02,
    amplitude: 1.0,
    octaves: 1,
    color1: '#4ade80',
    color2: '#22d3ee',
    rotation: 0.5,
    direction: 1, // clockwise
  },
  flowFields: {
    enabled: true,
    baseFrequency: 0.01,
    amplitude: 1.0,
    octaves: 1,
    lineLength: 20,
    lineDensity: 0.1,
    rotation: 0.3,
    direction: 1,
  },
  contour: {
    enabled: true,
    baseFrequency: 0.01,
    amplitude: 1.0,
    octaves: 4,
    levels: 5,
    smoothness: 0.3,
  },
  contourAffectsFlow: true,
};

export function getFlowFieldWavefieldValue(x: number, y: number, t: number, settings: Gen1Settings): number {
  let value = 0;
  for (let octave = 0; octave < settings.flowField.octaves; octave++) {
    const freq = settings.flowField.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.flowField.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

export function getFlowFieldsWavefieldValue(x: number, y: number, t: number, settings: Gen1Settings): number {
  let value = 0;
  for (let octave = 0; octave < settings.flowFields.octaves; octave++) {
    const freq = settings.flowFields.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.flowFields.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

export function getContourWavefieldValue(x: number, y: number, t: number, settings: Gen1Settings): number {
  let value = 0;
  for (let octave = 0; octave < settings.contour.octaves; octave++) {
    const freq = settings.contour.baseFrequency * Math.pow(2, octave);
    const amplitude = settings.contour.amplitude / Math.pow(2, octave);
    const phase = t * 0.01;
    value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
  }
  return value;
}

export function renderFlowField(ctx: CanvasRenderingContext2D, size: number, t: number, settings: Gen1Settings) {
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

export function renderFlowFields(ctx: CanvasRenderingContext2D, size: number, t: number, settings: Gen1Settings) {
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

export function renderContourMapping(ctx: CanvasRenderingContext2D, size: number, t: number, settings: Gen1Settings) {
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

export async function renderGen1GIF(settings: Gen1Settings = defaultGen1Settings, size: number = 512): Promise<Blob> {
  const totalFrames = 1000;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    throw new Error('Failed to get canvas context');
  }

  const frames: ImageData[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    tempCtx.clearRect(0, 0, size, size);

    const t = (frame / totalFrames) * 200;

    renderFlowField(tempCtx, size, t, settings);
    renderFlowFields(tempCtx, size, t, settings);
    renderContourMapping(tempCtx, size, t, settings);

    frames.push(tempCtx.getImageData(0, 0, size, size));
  }

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: size,
    height: size,
    workerScript: '/gif.worker.js',
  } as any);

  frames.forEach(frameData => {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = size;
    frameCanvas.height = size;
    const frameCtx = frameCanvas.getContext('2d');
    if (frameCtx) {
      frameCtx.putImageData(frameData, 0, 0);
      gif.addFrame(frameCanvas, { delay: 1000 / 30 });
    }
  });

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => resolve(blob));
    gif.on('error', (error: any) => reject(error));
    gif.render();
  });
}

