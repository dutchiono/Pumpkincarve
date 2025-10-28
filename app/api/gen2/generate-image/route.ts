import { NextRequest, NextResponse } from 'next/server';
// import sharp from 'sharp'; // Temporarily disabled - sharp not installed

// Define color palettes for different moods
const moodPalettes = {
  happy: {
    flow: { color1: '#FFD700', color2: '#FFA500' }, // Gold to Orange
    particles: '#FFD700',
  },
  sad: {
    flow: { color1: '#00008B', color2: '#ADD8E6' }, // Dark Blue to Light Blue
    particles: '#ADD8E6',
  },
  angry: {
    flow: { color1: '#8B0000', color2: '#FF4500', }, // Dark Red to OrangeRed
    particles: '#FF4500',
  },
  mixed: {
    flow: { color1: '#4B0082', color2: '#9370DB' }, // Indigo to MediumPurple
    particles: '#9370DB',
  },
  neutral: {
    flow: { color1: '#36454F', color2: '#D3D3D3' }, // Charcoal to LightGray
    particles: '#D3D3D3',
  },
};

// Function to generate SVG for Perlin noise flow field based on mood
function generateFlowFieldSvg(mood: string, frame: number, totalFrames: number, visualParams: any, dataSources: any): string {
  const palette = moodPalettes[mood as keyof typeof moodPalettes] || moodPalettes.neutral;

  let baseFrequency = visualParams.flowBaseFrequency;
  let numOctaves = visualParams.flowNumOctaves;
  let turbulenceSeed = frame * 80;
  let displacementScale = visualParams.flowDisplacementScale;
  const color1 = palette.flow.color1;
  const color2 = palette.flow.color2;

  // Placeholder for Neighbor Associations influence
  if (dataSources.enableNeighborAssociations) {
    // Logic to adjust flow field based on neighbor data
    // e.g., baseFrequency *= neighborCountFactor;
  }

  switch (mood) {
    case 'happy':
      baseFrequency *= 1.2;
      numOctaves -= 1;
      turbulenceSeed = frame * 100;
      displacementScale *= 1.4;
      break;
    case 'sad':
      baseFrequency *= 0.8;
      numOctaves += 1;
      turbulenceSeed = frame * 50;
      displacementScale *= 0.6;
      break;
    case 'angry':
      baseFrequency *= 1.5;
      numOctaves -= 2;
      turbulenceSeed = frame * 200;
      displacementScale *= 1.8;
      break;
    case 'mixed':
      baseFrequency *= 1.1;
      turbulenceSeed = frame * 120;
      displacementScale *= 1.2;
      break;
    default: // neutral
      // Use base visualParams
      break;
  }

  return `
    <svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="flowField" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" seed="${turbulenceSeed}" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" filter="url(#flowField)" />
    </svg>
  `;
}

// Function to generate SVG for particles based on mood
function generateParticleSvg(mood: string, frame: number, totalFrames: number, visualParams: any, dataSources: any): string {
  const palette = moodPalettes[mood as keyof typeof moodPalettes] || moodPalettes.neutral;

  let particleCount = visualParams.particleCount;
  let baseSpeed = visualParams.particleBaseSpeed;
  const particleColor = palette.particles;
  let minSize = visualParams.particleMinSize;
  let maxSize = visualParams.particleMaxSize;
  let chaosFactor = visualParams.particleChaosFactor;

  // Placeholder for Token Transactions influence
  if (dataSources.enableTokenTransactions) {
    // Logic to adjust particles based on transaction data
    // e.g., particleCount *= transactionVolumeFactor;
  }

  switch (mood) {
    case 'happy':
      particleCount *= 1.2;
      baseSpeed *= 1.5;
      minSize += 1;
      maxSize += 2;
      chaosFactor *= 0.8;
      break;
    case 'sad':
      particleCount *= 0.8;
      baseSpeed *= 0.7;
      minSize -= 1;
      maxSize -= 1;
      chaosFactor *= 1.2;
      break;
    case 'angry':
      particleCount *= 1.5;
      baseSpeed *= 2.0;
      minSize += 2;
      maxSize += 3;
      chaosFactor *= 1.5;
      break;
    case 'mixed':
      particleCount *= 1.1;
      baseSpeed *= 1.2;
      break;
    default: // neutral
      // Use base visualParams
      break;
  }

  let circles = '';
  for (let i = 0; i < particleCount; i++) {
    // Use a more complex movement pattern based on frame and chaosFactor
    const angle = (frame * baseSpeed * (i % 7)) + (i * 0.5) + (Math.sin(frame * chaosFactor + i) * 2);
    const radius = 150 + (Math.cos(frame * baseSpeed * (i % 5) + i) * 50);
    const x = 250 + radius * Math.cos(angle);
    const y = 250 + radius * Math.sin(angle);
    const size = minSize + (Math.sin(frame * 0.2 + i) * 0.5 + 0.5) * (maxSize - minSize);

    circles += `<circle cx="${x}" cy="${y}" r="${size}" fill="${particleColor}" opacity="1.0" />`;
  }

  return `
    <svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="transparent" />
      <g>
        ${circles}
      </g>
    </svg>
  `;
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Gen2 API temporarily disabled - missing sharp dependency' },
    { status: 503 }
  );

  /* TEMPORARILY DISABLED
  try {
    const { farcasterMood, visualParams, dataSources } = await req.json();

    // Conditionally apply mood if enabled
    const currentMood = dataSources.enableFarcasterMood ? (farcasterMood || 'neutral') : 'neutral';

    const totalFrames = 15; // Number of frames for the animation
    const frameDelay = 100; // Milliseconds per frame

    const frames: Buffer[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      // Generate flow field SVG for the current frame
      const flowFieldSvg = generateFlowFieldSvg(currentMood, frame, totalFrames, visualParams, dataSources);

      // Generate particle SVG for the current frame
      const particleSvg = generateParticleSvg(currentMood, frame, totalFrames, visualParams, dataSources);

      // Base image with transparent background
      let baseImage = sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      // Add flow field and particle SVGs as layers (no trait compositing)
      const compositeLayers = [
        { input: Buffer.from(flowFieldSvg) },
        { input: Buffer.from(particleSvg) }
      ];

      // Composite all layers
      const frameBuffer = await baseImage
        .composite(compositeLayers)
        .png()
        .toBuffer();

      frames.push(frameBuffer);
    }

    // Create animated WebP from first frame (sharp limitation - would need gifenc for true multi-frame)
    const animatedWebP = await sharp(frames[0])
      .webp({ quality: 100 })
      .toBuffer();

    return new NextResponse(animatedWebP, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
  */
}
