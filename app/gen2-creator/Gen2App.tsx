
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { gen2ABI } from './abi';

// Placeholder for the deployed contract address
const GEN2_CONTRACT_ADDRESS = '0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C';

// Placeholder for Farcaster user ID input
const DEFAULT_FARCASTER_USER_ID = 'ionoi'; // Example Farcaster user ID

interface NFT {
  id: number;
  name: string;
  imageUrl: string;
  attributes: { trait_type: string; value: string | number }[];
  owner: string;
}

interface Relationship {
  id: number;
  source: number;
  target: number;
  type: string;
  strength: number;
}

const Gen2App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [farcasterUserId, setFarcasterUserId] = useState<string>(DEFAULT_FARCASTER_USER_ID);
  const [farcasterMood, setFarcasterMood] = useState<string | null>(null);

  // Preset management
  const [presets, setPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    const storedPresets = localStorage.getItem('gen2-visual-presets');
    if (storedPresets) {
      setPresets(JSON.parse(storedPresets));
    }
  }, []);

  const savePreset = () => {
    if (!newPresetName) {
      alert('Please enter a preset name.');
      return;
    }
    const newPreset = {
      name: newPresetName,
      visualParams: {
        flowBaseFrequency,
        flowNumOctaves,
        flowDisplacementScale,
        particleCount,
        particleBaseSpeed,
        particleMinSize,
        particleMaxSize,
        particleChaosFactor,
        // Layer toggles
        enableFlowFieldLayer,
        enableParticleLayer,
        enableDensityFields,
        enableFlowFields,
        enableContourMapping,
        // Density Fields parameters
        densityBaseFreq,
        densityAmplitude,
        densityOctaves,
        densityScale,
        densityThreshold,
        densityIntensity,
        // Flow Fields parameters
        flowFieldBaseFreq,
        flowFieldAmplitude,
        flowFieldOctaves,
        flowFieldScale,
        flowLineLength,
        flowLineDensity,
        // Contour Mapping parameters
        contourBaseFreq,
        contourAmplitude,
        contourOctaves,
        contourScale,
        contourLevels,
        contourSmoothness,
      },
      dataSources: {
        enableFarcasterMood,
        enableNeighborAssociations,
        enableTokenTransactions,
        enableWalletHoldings,
      },
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('gen2-visual-presets', JSON.stringify(updatedPresets));
    setNewPresetName('');
    alert(`Preset '${newPresetName}' saved!`);
  };

  const loadPreset = (presetName: string) => {
    const presetToLoad = presets.find(p => p.name === presetName);
    if (presetToLoad) {
      setFlowBaseFrequency(presetToLoad.visualParams.flowBaseFrequency);
      setFlowNumOctaves(presetToLoad.visualParams.flowNumOctaves);
      setFlowDisplacementScale(presetToLoad.visualParams.flowDisplacementScale);
      setParticleCount(presetToLoad.visualParams.particleCount);
      setParticleBaseSpeed(presetToLoad.visualParams.particleBaseSpeed);
      setParticleMinSize(presetToLoad.visualParams.particleMinSize);
      setParticleMaxSize(presetToLoad.visualParams.particleMaxSize);
      setParticleChaosFactor(presetToLoad.visualParams.particleChaosFactor);

      // Load layer toggles and parameters if they exist
      if (presetToLoad.visualParams.enableDensityFields !== undefined) {
        // Layer toggles
        if (presetToLoad.visualParams.enableFlowFieldLayer !== undefined) {
          setEnableFlowFieldLayer(presetToLoad.visualParams.enableFlowFieldLayer);
        }
        if (presetToLoad.visualParams.enableParticleLayer !== undefined) {
          setEnableParticleLayer(presetToLoad.visualParams.enableParticleLayer);
        }
        setEnableDensityFields(presetToLoad.visualParams.enableDensityFields);
        setEnableFlowFields(presetToLoad.visualParams.enableFlowFields);
        setEnableContourMapping(presetToLoad.visualParams.enableContourMapping);
        
        // Density Fields parameters
        if (presetToLoad.visualParams.densityBaseFreq !== undefined) {
          setDensityBaseFreq(presetToLoad.visualParams.densityBaseFreq);
          setDensityAmplitude(presetToLoad.visualParams.densityAmplitude);
          setDensityOctaves(presetToLoad.visualParams.densityOctaves);
          setDensityScale(presetToLoad.visualParams.densityScale);
        }
        setDensityThreshold(presetToLoad.visualParams.densityThreshold);
        setDensityIntensity(presetToLoad.visualParams.densityIntensity);
        
        // Flow Fields parameters
        if (presetToLoad.visualParams.flowFieldBaseFreq !== undefined) {
          setFlowFieldBaseFreq(presetToLoad.visualParams.flowFieldBaseFreq);
          setFlowFieldAmplitude(presetToLoad.visualParams.flowFieldAmplitude);
          setFlowFieldOctaves(presetToLoad.visualParams.flowFieldOctaves);
          setFlowFieldScale(presetToLoad.visualParams.flowFieldScale);
        }
        setFlowLineLength(presetToLoad.visualParams.flowLineLength);
        setFlowLineDensity(presetToLoad.visualParams.flowLineDensity);
        
        // Contour Mapping parameters
        if (presetToLoad.visualParams.contourBaseFreq !== undefined) {
          setContourBaseFreq(presetToLoad.visualParams.contourBaseFreq);
          setContourAmplitude(presetToLoad.visualParams.contourAmplitude);
          setContourOctaves(presetToLoad.visualParams.contourOctaves);
          setContourScale(presetToLoad.visualParams.contourScale);
        }
        setContourLevels(presetToLoad.visualParams.contourLevels);
        setContourSmoothness(presetToLoad.visualParams.contourSmoothness);
      }

      setEnableFarcasterMood(presetToLoad.dataSources.enableFarcasterMood);
      setEnableNeighborAssociations(presetToLoad.dataSources.enableNeighborAssociations);
      setEnableTokenTransactions(presetToLoad.dataSources.enableTokenTransactions);
      setEnableWalletHoldings(presetToLoad.dataSources.enableWalletHoldings);

      generateImage(); // Regenerate image with loaded preset
    }
  };

  const deletePreset = () => {
    const presetName = (document.getElementById('load-preset') as HTMLSelectElement).value;
    if (!presetName) return;
    const updatedPresets = presets.filter(p => p.name !== presetName);
    setPresets(updatedPresets);
    localStorage.setItem('gen2-visual-presets', JSON.stringify(updatedPresets));
    alert(`Preset '${presetName}' deleted!`);
  };

  // Data Source Enable/Disable
  const [enableFarcasterMood, setEnableFarcasterMood] = useState(false);
  const [enableNeighborAssociations, setEnableNeighborAssociations] = useState(false);
  const [enableTokenTransactions, setEnableTokenTransactions] = useState(false);
  const [enableWalletHoldings, setEnableWalletHoldings] = useState(false);

  // Visual tuning parameters
  const [flowBaseFrequency, setFlowBaseFrequency] = useState(0.02);
  const [flowNumOctaves, setFlowNumOctaves] = useState(4);
  const [flowDisplacementScale, setFlowDisplacementScale] = useState(50);
  const [flowRotation, setFlowRotation] = useState(0);
  const [particleCount, setParticleCount] = useState(35);
  const [particleBaseSpeed, setParticleBaseSpeed] = useState(0.03);
  const [particleMinSize, setParticleMinSize] = useState(3);
  const [particleMaxSize, setParticleMaxSize] = useState(7);
  const [particleChaosFactor, setParticleChaosFactor] = useState(0.08);

  // Color parameters
  const [flowColor1, setFlowColor1] = useState('#4ade80');
  const [flowColor2, setFlowColor2] = useState('#22d3ee');
  const [particleColor1, setParticleColor1] = useState('#22d3ee');
  const [particleColor2, setParticleColor2] = useState('#a78bfa');
  const [particleFadeSpeed, setParticleFadeSpeed] = useState(50);

  // Movement pattern
  const [particlePattern, setParticlePattern] = useState<'circle' | 'swirl' | 'spiral' | 'wave' | 'random'>('circle');

  // Visual Layer Toggles
  const [enableFlowFieldLayer, setEnableFlowFieldLayer] = useState(true);
  const [enableParticleLayer, setEnableParticleLayer] = useState(true);
  const [enableDensityFields, setEnableDensityFields] = useState(true);
  const [enableFlowFields, setEnableFlowFields] = useState(true);
  const [enableContourMapping, setEnableContourMapping] = useState(true);

  // Density Fields Layer Parameters
  const [densityBaseFreq, setDensityBaseFreq] = useState(0.01);
  const [densityAmplitude, setDensityAmplitude] = useState(1.0);
  const [densityOctaves, setDensityOctaves] = useState(4);
  const [densityScale, setDensityScale] = useState('major');
  const [densityThreshold, setDensityThreshold] = useState(0.5);
  const [densityIntensity, setDensityIntensity] = useState(0.8);

  // Flow Fields Layer Parameters
  const [flowFieldBaseFreq, setFlowFieldBaseFreq] = useState(0.01);
  const [flowFieldAmplitude, setFlowFieldAmplitude] = useState(1.0);
  const [flowFieldOctaves, setFlowFieldOctaves] = useState(4);
  const [flowFieldScale, setFlowFieldScale] = useState('major');
  const [flowLineLength, setFlowLineLength] = useState(20);
  const [flowLineDensity, setFlowLineDensity] = useState(0.1);

  // Contour Mapping Layer Parameters
  const [contourBaseFreq, setContourBaseFreq] = useState(0.01);
  const [contourAmplitude, setContourAmplitude] = useState(1.0);
  const [contourOctaves, setContourOctaves] = useState(4);
  const [contourScale, setContourScale] = useState('major');
  const [contourLevels, setContourLevels] = useState(5);
  const [contourSmoothness, setContourSmoothness] = useState(0.3);

  const { writeContract } = useWriteContract();
  const { data: mintPrice } = useReadContract({
    address: GEN2_CONTRACT_ADDRESS,
    abi: gen2ABI,
    functionName: 'mintPrice',
  });

  // Harmonic Wavefield Functions
  const musicalScales = {
    major: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8], // C Major scale ratios
    minor: [1, 9/8, 6/5, 4/3, 3/2, 8/5, 9/5], // A Minor scale ratios
    pentatonic: [1, 9/8, 5/4, 3/2, 5/3], // Pentatonic scale ratios
    chromatic: [1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 9/5, 15/8] // Chromatic scale ratios
  };

  // Simple noise function (can be replaced with Perlin/Simplex later)
  const noise = (x: number, y: number, t: number = 0): number => {
    return Math.sin(x * 0.01) * Math.cos(y * 0.01) * Math.sin(t * 0.1);
  };

  // Calculate particle count based on wallet count (simulated for now)
  const getWalletBasedParticleCount = () => {
    // For now, simulate wallet count based on current particle count slider
    // In production, this would come from on-chain data or API calls
    const simulatedWalletCount = Math.floor(particleCount / 10); // Simulate 1 wallet per 10 particles
    return Math.max(10, Math.min(200, simulatedWalletCount * 5)); // 5 particles per wallet, min 10, max 200
  };

  // Density Fields wavefield value function
  const getDensityWavefieldValue = (x: number, y: number, t: number): number => {
    const scale = musicalScales[densityScale as keyof typeof musicalScales] || musicalScales.major;
    let value = 0;
    
    for (let octave = 0; octave < densityOctaves; octave++) {
      const freq = densityBaseFreq * Math.pow(2, octave);
      const amplitude = densityAmplitude / Math.pow(2, octave);
      for (let i = 0; i < scale.length; i++) {
        const harmonicFreq = freq * scale[i];
        const phase = t * 0.01;
        value += amplitude * Math.sin(x * harmonicFreq + phase) * Math.cos(y * harmonicFreq + phase);
      }
    }
    
    // Apply Farcaster mood adjustments if enabled
    if (enableFarcasterMood && farcasterMood) {
      const mood = farcasterMood.toLowerCase();
      if (mood.includes('positive') || mood.includes('happy') || mood.includes('excited')) {
        value *= 1.2;
      } else if (mood.includes('negative') || mood.includes('sad') || mood.includes('angry')) {
        value *= 0.8;
      }
    }
    
    return value;
  };

  // Flow Fields wavefield value function
  const getFlowFieldWavefieldValue = (x: number, y: number, t: number): number => {
    const scale = musicalScales[flowFieldScale as keyof typeof musicalScales] || musicalScales.major;
    let value = 0;
    
    for (let octave = 0; octave < flowFieldOctaves; octave++) {
      const freq = flowFieldBaseFreq * Math.pow(2, octave);
      const amplitude = flowFieldAmplitude / Math.pow(2, octave);
      for (let i = 0; i < scale.length; i++) {
        const harmonicFreq = freq * scale[i];
        const phase = t * 0.01;
        value += amplitude * Math.sin(x * harmonicFreq + phase) * Math.cos(y * harmonicFreq + phase);
      }
    }
    
    // Apply Farcaster mood adjustments if enabled
    if (enableFarcasterMood && farcasterMood) {
      const mood = farcasterMood.toLowerCase();
      if (mood.includes('positive') || mood.includes('happy') || mood.includes('excited')) {
        value *= 1.2;
      } else if (mood.includes('negative') || mood.includes('sad') || mood.includes('angry')) {
        value *= 0.8;
      }
    }
    
    return value;
  };

  // Contour Mapping wavefield value function
  const getContourWavefieldValue = (x: number, y: number, t: number): number => {
    const scale = musicalScales[contourScale as keyof typeof musicalScales] || musicalScales.major;
    let value = 0;
    
    for (let octave = 0; octave < contourOctaves; octave++) {
      const freq = contourBaseFreq * Math.pow(2, octave);
      const amplitude = contourAmplitude / Math.pow(2, octave);
      for (let i = 0; i < scale.length; i++) {
        const harmonicFreq = freq * scale[i];
        const phase = t * 0.01;
        value += amplitude * Math.sin(x * harmonicFreq + phase) * Math.cos(y * harmonicFreq + phase);
      }
    }
    
    // Apply Farcaster mood adjustments if enabled
    if (enableFarcasterMood && farcasterMood) {
      const mood = farcasterMood.toLowerCase();
      if (mood.includes('positive') || mood.includes('happy') || mood.includes('excited')) {
        value *= 1.2;
      } else if (mood.includes('negative') || mood.includes('sad') || mood.includes('angry')) {
        value *= 0.8;
      }
    }
    
    return value;
  };

  // Density Fields: Probability-based dots
  const renderDensityFields = (ctx: CanvasRenderingContext2D, size: number, t: number) => {
    if (!enableDensityFields) return;

    const gridSize = 4; // Resolution for density calculation
    const cellSize = size / gridSize;
    for (let py = 0; py < gridSize; py++) {
      for (let px = 0; px < gridSize; px++) {
        const x = px * cellSize;
        const y = py * cellSize;
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const waveValue = getDensityWavefieldValue(centerX, centerY, t);
        const probability = (waveValue + 1) / 2; // Normalize to 0-1
        const density = probability * densityIntensity;
        if (probability > densityThreshold) {
          const numDots = Math.floor(density * 20);
          for (let i = 0; i < numDots; i++) {
            const dotX = x + Math.random() * cellSize;
            const dotY = y + Math.random() * cellSize;
            const dotSize = Math.random() * 2 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${probability * 0.8})`;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  };

  // Flow Fields: Vector-based lines
  const renderFlowFields = (ctx: CanvasRenderingContext2D, size: number, t: number) => {
    if (!enableFlowFields) return;

    const gridSize = Math.floor(size * flowLineDensity);
    const cellSize = size / gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    for (let py = 0; py < gridSize; py++) {
      for (let px = 0; px < gridSize; px++) {
        const x = px * cellSize;
        const y = py * cellSize;
        // Calculate gradient (flow direction)
        const eps = 1;
        const waveValue = getFlowFieldWavefieldValue(x, y, t);
        const gradX = getFlowFieldWavefieldValue(x + eps, y, t) - waveValue;
        const gradY = getFlowFieldWavefieldValue(x, y + eps, t) - waveValue;
        // Normalize gradient to get direction
        const length = Math.sqrt(gradX * gradX + gradY * gradY);
        if (length > 0) {
          const dirX = gradX / length;
          const dirY = gradY / length;
          // Draw line in flow direction
          const startX = x + cellSize / 2;
          const startY = y + cellSize / 2;
          const endX = startX + dirX * flowLineLength;
          const endY = startY + dirY * flowLineLength;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    }
  };

  // Contour Mapping: Threshold-based solid shapes
  const renderContourMapping = (ctx: CanvasRenderingContext2D, size: number, t: number) => {
    if (!enableContourMapping) return;

    const gridSize = 32;
    const cellSize = size / gridSize;
    // Create contour levels
    const levels = [];
    for (let i = 0; i < contourLevels; i++) {
      levels.push((i / contourLevels) * 2 - 1); // -1 to 1 range
    }
    // Render each contour level
    levels.forEach((level, levelIndex) => {
      const alpha = (levelIndex + 1) / contourLevels * 0.3;
      ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const x = px * cellSize;
          const y = py * cellSize;
          const centerX = x + cellSize / 2;
          const centerY = y + cellSize / 2;
          const waveValue = getContourWavefieldValue(centerX, centerY, t);
          // Check if this cell is within the contour level
          const nextLevel = levelIndex < levels.length - 1 ? levels[levelIndex + 1] : 1;
          if (waveValue >= level && waveValue < nextLevel) {
            // Apply smoothness by checking neighboring cells
            let smoothFactor = 1;
            if (contourSmoothness > 0) {
              const neighborValues = [
                getContourWavefieldValue(centerX - cellSize, centerY, t),
                getContourWavefieldValue(centerX + cellSize, centerY, t),
                getContourWavefieldValue(centerX, centerY - cellSize, t),
                getContourWavefieldValue(centerX, centerY + cellSize, t)
              ];
              const avgNeighbor = neighborValues.reduce((a, b) => a + b, 0) / neighborValues.length;
              smoothFactor = Math.abs(waveValue - avgNeighbor) < contourSmoothness ? 1 : 0.3;
            }
            ctx.globalAlpha = alpha * smoothFactor;
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
    });
    ctx.globalAlpha = 1; // Reset alpha
  };


  const generateImage = async () => {
    try {
      const response = await fetch('/api/gen2/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farcasterMood: enableFarcasterMood ? farcasterMood : null,
          visualParams: {
            flowBaseFrequency,
            flowNumOctaves,
            flowDisplacementScale,
            particleCount,
            particleBaseSpeed,
            particleMinSize,
            particleMaxSize,
            particleChaosFactor,
          },
          dataSources: {
            enableFarcasterMood,
            enableNeighborAssociations,
            enableTokenTransactions,
            enableWalletHoldings,
          },
        }),
      });

      if (response.ok) {
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setPreviewImage(imageUrl);
      } else {
        console.error('Error generating image:', await response.text());
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const fetchFarcasterMood = useCallback(async () => {
    if (!enableFarcasterMood) {
      setFarcasterMood(null);
      generateImage(); // Regenerate image with mood disabled
      return;
    }
    try {
      const response = await fetch('/api/gen2/farcaster-mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: farcasterUserId }),
      });

      if (response.ok) {
        const { mood } = await response.json();
        setFarcasterMood(mood);
        // Regenerate image with new mood
        generateImage();
      } else {
        console.error('Error fetching Farcaster mood:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching Farcaster mood:', error);
    }
  }, [farcasterUserId, generateImage, enableFarcasterMood]);

  const handleMint = async () => {
    try {
      const response = await fetch('/api/gen2/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farcasterMood: enableFarcasterMood ? farcasterMood : null,
          visualParams: {
            flowBaseFrequency,
            flowNumOctaves,
            flowDisplacementScale,
            particleCount,
            particleBaseSpeed,
            particleMinSize,
            particleMaxSize,
            particleChaosFactor,
          },
        }),
      });

      if (response.ok) {
        const { imageUrl, metadata } = await response.json();
        setMetadataUrl(imageUrl);

        if (mintPrice === undefined) {
          console.error('Mint price is not available');
          return;
        }

        writeContract({
          address: GEN2_CONTRACT_ADDRESS,
          abi: gen2ABI,
          functionName: 'mint',
          args: [imageUrl, JSON.stringify(metadata)],
          value: mintPrice as bigint,
        });
      } else {
        console.error('Error minting NFT:', await response.text());
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
    }
  };

  // Live canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 500;
    canvas.width = size;
    canvas.height = size;

    const moodPalettes = {
      happy: { flow: { color1: '#FFD700', color2: '#FFA500' }, particles: '#FFD700' },
      sad: { flow: { color1: '#00008B', color2: '#ADD8E6' }, particles: '#ADD8E6' },
      angry: { flow: { color1: '#8B0000', color2: '#FF4500' }, particles: '#FF4500' },
      mixed: { flow: { color1: '#4B0082', color2: '#9370DB' }, particles: '#9370DB' },
      neutral: { flow: { color1: '#36454F', color2: '#D3D3D3' }, particles: '#D3D3D3' },
    };

    const particles: any[] = [];
    // Use manual colors if mood is disabled, otherwise override with mood colors
    let palette;
    if (enableFarcasterMood && farcasterMood && (farcasterMood === 'happy' || farcasterMood === 'sad' || farcasterMood === 'angry' || farcasterMood === 'mixed' || farcasterMood === 'neutral')) {
      palette = moodPalettes[farcasterMood];
    } else {
      palette = { flow: { color1: flowColor1, color2: flowColor2 }, particles: particleColor1 };
    }

    const finalParticleColor1 = particleColor1;
    const finalParticleColor2 = particleColor2;

    // Use wallet-based particle count
    const actualParticleCount = getWalletBasedParticleCount();
    for (let i = 0; i < actualParticleCount; i++) {
      particles.push({
        x: Math.random() * size,
        y: Math.random() * size,
        vx: (Math.random() - 0.5) * particleBaseSpeed * 100,
        vy: (Math.random() - 0.5) * particleBaseSpeed * 100,
        size: Math.random() * (particleMaxSize - particleMinSize) + particleMinSize,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Define animation loop duration (frames for full cycle)
    const LOOP_DURATION = 300; // 5 seconds at 60fps, creates smooth looping

    let frame = 0;
    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Create animated gradient background with noise distortion - OPTIMIZED
      // Only compute noise at lower resolution for performance
      const noiseResolution = 32; // Compute noise at 32x32 grid instead of full resolution
      const cellSize = size / noiseResolution;

      for (let py = 0; py < noiseResolution; py++) {
        for (let px = 0; px < noiseResolution; px++) {
          const nx = px / noiseResolution;
          const ny = py / noiseResolution;

          // Animated noise using flow field parameters
          const noise = Math.sin(nx * flowBaseFrequency * 20 * flowNumOctaves + frame * 0.1) *
                       Math.cos(ny * flowBaseFrequency * 20 * flowNumOctaves + frame * 0.1);

          const gradientFactor = (noise + 1) / 2;

          // Interpolate between flow colors
          const r1 = parseInt(palette.flow.color1.slice(1, 3), 16);
          const g1 = parseInt(palette.flow.color1.slice(3, 5), 16);
          const b1 = parseInt(palette.flow.color1.slice(5, 7), 16);
          const r2 = parseInt(palette.flow.color2.slice(1, 3), 16);
          const g2 = parseInt(palette.flow.color2.slice(3, 5), 16);
          const b2 = parseInt(palette.flow.color2.slice(5, 7), 16);

          const r = Math.round(r1 + (r2 - r1) * gradientFactor);
          const g = Math.round(g1 + (g2 - g1) * gradientFactor);
          const b = Math.round(b1 + (b2 - b1) * gradientFactor);

          // Fill cell with color
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
        }
      }

      // Normalize frame to 0-1 for seamless looping
      const t = (frame % LOOP_DURATION) / LOOP_DURATION;

      // Render Harmonic Wavefield Layers
      renderDensityFields(ctx, size, frame);
      renderFlowFields(ctx, size, frame);
      renderContourMapping(ctx, size, frame);

      particles.forEach((p, i) => {
        const phase = (i / particleCount) * Math.PI * 2;
        let x, y;

        // Different movement patterns
        switch (particlePattern) {
          case 'swirl': {
            // Particles spiral inward/outward
            const swirlRadius = 150 + (Math.cos(t * Math.PI * 2 * 3 + i) * 50);
            const swirlAngle = (t * Math.PI * 2 * 2) + phase;
            x = size / 2 + swirlRadius * Math.cos(swirlAngle);
            y = size / 2 + swirlRadius * Math.sin(swirlAngle);
            break;
          }
          case 'spiral': {
            // Tight spiral pattern
            const spiralRadius = 100 + t * 100;
            const spiralAngle = (t * Math.PI * 2 * 4) + phase;
            x = size / 2 + spiralRadius * Math.cos(spiralAngle);
            y = size / 2 + spiralRadius * Math.sin(spiralAngle);
            break;
          }
          case 'wave': {
            // Wave-like motion
            const wave = Math.sin(t * Math.PI * 2 + i * 0.5) * 100;
            x = size / 2 + wave;
            y = size / 2 + (i / particleCount) * size - size / 2;
            break;
          }
          case 'random': {
            // Chaotic random motion
            x = size / 2 + (Math.sin(t * Math.PI * 2 * particleChaosFactor * 10 + i) * 150);
            y = size / 2 + (Math.cos(t * Math.PI * 2 * particleChaosFactor * 7 + i) * 150);
            break;
          }
          case 'circle':
          default: {
            // Circular motion with chaos
            const circleAngle = (t * Math.PI * 2) + phase + (Math.sin(t * Math.PI * 2 * particleChaosFactor * 10 + i) * particleChaosFactor);
            const circleRadius = 150 + (Math.cos(t * Math.PI * 2 * 2 + i) * 50);
            x = size / 2 + circleRadius * Math.cos(circleAngle);
            y = size / 2 + circleRadius * Math.sin(circleAngle);
            break;
          }
        }

        // Fade between colors
        const fadeProgress = (Math.sin(t * Math.PI * 2 * (particleFadeSpeed / 10) + i) + 1) / 2;
        const r1 = parseInt(finalParticleColor1.slice(1, 3), 16);
        const g1 = parseInt(finalParticleColor1.slice(3, 5), 16);
        const b1 = parseInt(finalParticleColor1.slice(5, 7), 16);
        const r2 = parseInt(finalParticleColor2.slice(1, 3), 16);
        const g2 = parseInt(finalParticleColor2.slice(3, 5), 16);
        const b2 = parseInt(finalParticleColor2.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * fadeProgress);
        const g = Math.round(g1 + (g2 - g1) * fadeProgress);
        const b = Math.round(b1 + (b2 - b1) * fadeProgress);
        const fadeColor = `rgb(${r}, ${g}, ${b})`;

        ctx.fillStyle = fadeColor;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      frame++;
      window.requestAnimationFrame(render);
    };

    render();
  }, [particleCount, particleBaseSpeed, particleMinSize, particleMaxSize, particleChaosFactor, enableFarcasterMood, farcasterMood, flowColor1, flowColor2, particleColor1, particleColor2, particleFadeSpeed, particlePattern, enableFlowFieldLayer, enableParticleLayer, enableDensityFields, enableFlowFields, enableContourMapping, densityBaseFreq, densityAmplitude, densityOctaves, densityScale, densityThreshold, densityIntensity, flowFieldBaseFreq, flowFieldAmplitude, flowFieldOctaves, flowFieldScale, flowLineLength, flowLineDensity, contourBaseFreq, contourAmplitude, contourOctaves, contourScale, contourLevels, contourSmoothness]);

  useEffect(() => {
    fetchFarcasterMood();
  }, [fetchFarcasterMood]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200 font-sans">
      <header className="bg-slate-800 p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-cyan-400">Gen2 NFT Development Studio</h1>
        <p className="text-slate-400">Visual art studio for algorithmic "Mood Ring" NFTs - tune generative parameters.</p>
      </header>
      <main style={{ display: 'flex', flexDirection: 'row', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgb(51, 65, 85)', padding: '1rem', overflowY: 'auto' }}>
          <h2 className="text-xl font-bold mb-4 text-cyan-300">Data Source Influence</h2>
          <div className="space-y-2 mb-6">
            <div className="flex items-center">
              <input
                id="enable-farcaster-mood"
                type="checkbox"
                checked={enableFarcasterMood}
                onChange={e => setEnableFarcasterMood(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-farcaster-mood" className="ml-2 block text-sm text-gray-400">
                Enable Farcaster Mood Influence (requires user ID below)
              </label>
            </div>
            {enableFarcasterMood && (
              <div className="ml-6 space-y-2">
                <div>
                  <label htmlFor="farcaster-user-id" className="block text-xs font-medium text-gray-500 mb-1">
                    Farcaster User ID
                  </label>
                  <input
                    type="text"
                    id="farcaster-user-id"
                    value={farcasterUserId}
                    onChange={e => setFarcasterUserId(e.target.value)}
                    onBlur={fetchFarcasterMood}
                    className="block w-full pl-2 pr-2 py-1 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                    placeholder="e.g., ionoi"
                  />
                </div>
                {farcasterMood && (
                  <p className="text-xs text-gray-400">Current Mood: <span className="font-semibold text-cyan-400">{farcasterMood}</span></p>
                )}
              </div>
            )}
            <div className="flex items-center">
              <input
                id="enable-neighbor-associations"
                type="checkbox"
                checked={enableNeighborAssociations}
                onChange={e => setEnableNeighborAssociations(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-neighbor-associations" className="ml-2 block text-sm text-gray-400">
                Enable Neighbor Associations Influence (Coming Soon)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-token-transactions"
                type="checkbox"
                checked={enableTokenTransactions}
                onChange={e => setEnableTokenTransactions(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-token-transactions" className="ml-2 block text-sm text-gray-400">
                Enable Token Transactions Influence (Coming Soon)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-wallet-holdings"
                type="checkbox"
                checked={enableWalletHoldings}
                onChange={e => setEnableWalletHoldings(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-wallet-holdings" className="ml-2 block text-sm text-gray-400">
                Enable Total Wallet Holdings Influence (Coming Soon)
              </label>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Visual Layer Toggles</h2>
          <div className="space-y-2 mb-6">
            <div className="flex items-center">
              <input
                id="enable-flow-field-layer"
                type="checkbox"
                checked={enableFlowFieldLayer}
                onChange={e => setEnableFlowFieldLayer(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-flow-field-layer" className="ml-2 block text-sm text-gray-400">
                Flow Field Layer
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-particle-layer"
                type="checkbox"
                checked={enableParticleLayer}
                onChange={e => setEnableParticleLayer(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-particle-layer" className="ml-2 block text-sm text-gray-400">
                Particle Layer
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-density-fields"
                type="checkbox"
                checked={enableDensityFields}
                onChange={e => setEnableDensityFields(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-density-fields" className="ml-2 block text-sm text-gray-400">
                Density Fields Layer
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-flow-fields"
                type="checkbox"
                checked={enableFlowFields}
                onChange={e => setEnableFlowFields(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-flow-fields" className="ml-2 block text-sm text-gray-400">
                Flow Fields Layer
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="enable-contour-mapping"
                type="checkbox"
                checked={enableContourMapping}
                onChange={e => setEnableContourMapping(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="enable-contour-mapping" className="ml-2 block text-sm text-gray-400">
                Contour Mapping Layer
              </label>
            </div>
          </div>

          {enableFlowFieldLayer && (
            <>
              <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Flow Field Layer Controls</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="flow-color-1" className="block text-sm font-medium text-gray-400 mb-1">Flow Color 1</label>
                  <input type="color" id="flow-color-1" value={flowColor1} onChange={e => setFlowColor1(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                </div>
                <div>
                  <label htmlFor="flow-color-2" className="block text-sm font-medium text-gray-400 mb-1">Flow Color 2</label>
                  <input type="color" id="flow-color-2" value={flowColor2} onChange={e => setFlowColor2(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                </div>
                <div>
                  <label htmlFor="flow-base-frequency" className="block text-sm font-medium text-gray-400 mb-1">Base Frequency ({flowBaseFrequency.toFixed(2)})</label>
                  <input type="range" id="flow-base-frequency" min="0.01" max="0.1" step="0.005" value={flowBaseFrequency} onChange={e => setFlowBaseFrequency(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Wavelength of the flow field - lower = smoother waves</p>
                </div>
                <div>
                  <label htmlFor="flow-num-octaves" className="block text-sm font-medium text-gray-400 mb-1">Num Octaves ({flowNumOctaves})</label>
                  <input type="range" id="flow-num-octaves" min="1" max="10" step="1" value={flowNumOctaves} onChange={e => setFlowNumOctaves(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Detail levels in the flow - more = finer details</p>
                </div>
                <div>
                  <label htmlFor="flow-displacement-scale" className="block text-sm font-medium text-gray-400 mb-1">Displacement Scale ({flowDisplacementScale})</label>
                  <input type="range" id="flow-displacement-scale" min="0" max="200" step="5" value={flowDisplacementScale} onChange={e => setFlowDisplacementScale(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Strength of flow distortion - higher = more twisted</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mb-6">Note: Flow field parameters currently affect SVG generation only, not live canvas</p>
            </>
          )}

          {enableParticleLayer && (
            <>
              <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Particle Layer Controls</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="particle-color-1" className="block text-sm font-medium text-gray-400 mb-1">Color 1 (fades to Color 2)</label>
                  <input type="color" id="particle-color-1" value={particleColor1} onChange={e => setParticleColor1(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                </div>
                <div>
                  <label htmlFor="particle-color-2" className="block text-sm font-medium text-gray-400 mb-1">Color 2</label>
                  <input type="color" id="particle-color-2" value={particleColor2} onChange={e => setParticleColor2(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                </div>
                <div>
                  <label htmlFor="particle-fade-speed" className="block text-sm font-medium text-gray-400 mb-1">Fade Speed ({particleFadeSpeed / 10})</label>
                  <input type="range" id="particle-fade-speed" min="10" max="100" step="5" value={particleFadeSpeed} onChange={e => setParticleFadeSpeed(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">How fast particles fade between colors</p>
                </div>
                <div>
                  <label htmlFor="particle-pattern" className="block text-sm font-medium text-gray-400 mb-1">Movement Pattern</label>
                  <select id="particle-pattern" value={particlePattern} onChange={e => setParticlePattern(e.target.value as any)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="circle">Circle - particles orbit in circular paths</option>
                    <option value="swirl">Swirl - particles spiral inward and outward</option>
                    <option value="spiral">Spiral - continuous spiral motion</option>
                    <option value="wave">Wave - wave-like horizontal motion</option>
                    <option value="random">Random - chaotic random movement</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="particle-count" className="block text-sm font-medium text-gray-400 mb-1">Particle Count ({particleCount})</label>
                  <input type="range" id="particle-count" min="0" max="100" step="5" value={particleCount} onChange={e => setParticleCount(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Number of particles in the scene</p>
                </div>
                <div>
                  <label htmlFor="particle-base-speed" className="block text-sm font-medium text-gray-400 mb-1">Base Speed ({particleBaseSpeed.toFixed(2)})</label>
                  <input type="range" id="particle-base-speed" min="0.01" max="0.2" step="0.01" value={particleBaseSpeed} onChange={e => setParticleBaseSpeed(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Overall speed of particle movement</p>
                </div>
                <div>
                  <label htmlFor="particle-chaos-factor" className="block text-sm font-medium text-gray-400 mb-1">Chaos Factor ({particleChaosFactor.toFixed(2)})</label>
                  <input type="range" id="particle-chaos-factor" min="0" max="0.5" step="0.05" value={particleChaosFactor} onChange={e => setParticleChaosFactor(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Adds randomness/jitter to movement (0=smooth, 0.5=chaotic)</p>
                </div>
                <div>
                  <label htmlFor="particle-min-size" className="block text-sm font-medium text-gray-400 mb-1">Min Size ({particleMinSize})</label>
                  <input type="range" id="particle-min-size" min="1" max="10" step="1" value={particleMinSize} onChange={e => setParticleMinSize(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label htmlFor="particle-max-size" className="block text-sm font-medium text-gray-400 mb-1">Max Size ({particleMaxSize})</label>
                  <input type="range" id="particle-max-size" min="5" max="20" step="1" value={particleMaxSize} onChange={e => setParticleMaxSize(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            </>
          )}

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Data Integration Status</h2>
          <div className="bg-slate-800 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Simulated Wallet Count:</span>
                <span className="ml-2 text-cyan-300 font-mono">{Math.floor(particleCount / 10)}</span>
              </div>
              <div>
                <span className="text-gray-400">Actual Particle Count:</span>
                <span className="ml-2 text-cyan-300 font-mono">{getWalletBasedParticleCount()}</span>
              </div>
              <div>
                <span className="text-gray-400">Farcaster Mood:</span>
                <span className="ml-2 text-cyan-300">{farcasterMood || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-400">Active Layers:</span>
                <span className="ml-2 text-cyan-300">
                  {[enableDensityFields && 'Density', enableFlowFields && 'Flow', enableContourMapping && 'Contour'].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {enableDensityFields && (
            <>
              <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Density Fields Layer Controls</h2>
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <input
                    id="enable-density-fields-toggle"
                    type="checkbox"
                    checked={enableDensityFields}
                    onChange={e => setEnableDensityFields(e.target.checked)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-density-fields-toggle" className="ml-2 block text-sm text-gray-400">
                    Enable/Disable
                  </label>
                </div>
                <div>
                  <label htmlFor="density-base-freq" className="block text-sm font-medium text-gray-400 mb-1">Base Frequency ({densityBaseFreq.toFixed(3)})</label>
                  <input type="range" id="density-base-freq" min="0.001" max="0.05" step="0.001" value={densityBaseFreq} onChange={e => setDensityBaseFreq(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Fundamental frequency of the density wavefield</p>
                </div>
                <div>
                  <label htmlFor="density-amplitude" className="block text-sm font-medium text-gray-400 mb-1">Amplitude ({densityAmplitude.toFixed(1)})</label>
                  <input type="range" id="density-amplitude" min="0.1" max="3.0" step="0.1" value={densityAmplitude} onChange={e => setDensityAmplitude(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Overall strength of the density wavefield</p>
                </div>
                <div>
                  <label htmlFor="density-octaves" className="block text-sm font-medium text-gray-400 mb-1">Octaves ({densityOctaves})</label>
                  <input type="range" id="density-octaves" min="1" max="8" step="1" value={densityOctaves} onChange={e => setDensityOctaves(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Number of harmonic layers</p>
                </div>
                <div>
                  <label htmlFor="density-scale" className="block text-sm font-medium text-gray-400 mb-1">Musical Scale</label>
                  <select id="density-scale" value={densityScale} onChange={e => setDensityScale(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="major">Major Scale (happy, bright)</option>
                    <option value="minor">Minor Scale (sad, dark)</option>
                    <option value="pentatonic">Pentatonic Scale (simple, clean)</option>
                    <option value="chromatic">Chromatic Scale (complex, dissonant)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="density-threshold" className="block text-sm font-medium text-gray-400 mb-1">Threshold ({densityThreshold.toFixed(2)})</label>
                  <input type="range" id="density-threshold" min="0" max="1" step="0.05" value={densityThreshold} onChange={e => setDensityThreshold(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Minimum wave value to show dots</p>
                </div>
                <div>
                  <label htmlFor="density-intensity" className="block text-sm font-medium text-gray-400 mb-1">Intensity ({densityIntensity.toFixed(2)})</label>
                  <input type="range" id="density-intensity" min="0" max="2" step="0.1" value={densityIntensity} onChange={e => setDensityIntensity(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Density of dots when threshold is met</p>
                </div>
              </div>
            </>
          )}

          {enableFlowFields && (
            <>
              <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Flow Fields Layer Controls</h2>
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <input
                    id="enable-flow-fields-toggle"
                    type="checkbox"
                    checked={enableFlowFields}
                    onChange={e => setEnableFlowFields(e.target.checked)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-flow-fields-toggle" className="ml-2 block text-sm text-gray-400">
                    Enable/Disable
                  </label>
                </div>
                <div>
                  <label htmlFor="flow-field-base-freq" className="block text-sm font-medium text-gray-400 mb-1">Base Frequency ({flowFieldBaseFreq.toFixed(3)})</label>
                  <input type="range" id="flow-field-base-freq" min="0.001" max="0.05" step="0.001" value={flowFieldBaseFreq} onChange={e => setFlowFieldBaseFreq(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Fundamental frequency of the flow field wavefield</p>
                </div>
                <div>
                  <label htmlFor="flow-field-amplitude" className="block text-sm font-medium text-gray-400 mb-1">Amplitude ({flowFieldAmplitude.toFixed(1)})</label>
                  <input type="range" id="flow-field-amplitude" min="0.1" max="3.0" step="0.1" value={flowFieldAmplitude} onChange={e => setFlowFieldAmplitude(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Overall strength of the flow field wavefield</p>
                </div>
                <div>
                  <label htmlFor="flow-field-octaves" className="block text-sm font-medium text-gray-400 mb-1">Octaves ({flowFieldOctaves})</label>
                  <input type="range" id="flow-field-octaves" min="1" max="8" step="1" value={flowFieldOctaves} onChange={e => setFlowFieldOctaves(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Number of harmonic layers</p>
                </div>
                <div>
                  <label htmlFor="flow-field-scale" className="block text-sm font-medium text-gray-400 mb-1">Musical Scale</label>
                  <select id="flow-field-scale" value={flowFieldScale} onChange={e => setFlowFieldScale(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="major">Major Scale (happy, bright)</option>
                    <option value="minor">Minor Scale (sad, dark)</option>
                    <option value="pentatonic">Pentatonic Scale (simple, clean)</option>
                    <option value="chromatic">Chromatic Scale (complex, dissonant)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="flow-line-length" className="block text-sm font-medium text-gray-400 mb-1">Line Length ({flowLineLength})</label>
                  <input type="range" id="flow-line-length" min="5" max="50" step="1" value={flowLineLength} onChange={e => setFlowLineLength(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Length of flow direction lines</p>
                </div>
                <div>
                  <label htmlFor="flow-line-density" className="block text-sm font-medium text-gray-400 mb-1">Line Density ({flowLineDensity.toFixed(2)})</label>
                  <input type="range" id="flow-line-density" min="0.02" max="0.3" step="0.01" value={flowLineDensity} onChange={e => setFlowLineDensity(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Density of flow field grid</p>
                </div>
              </div>
            </>
          )}

          {enableContourMapping && (
            <>
              <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Contour Mapping Layer Controls</h2>
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <input
                    id="enable-contour-mapping-toggle"
                    type="checkbox"
                    checked={enableContourMapping}
                    onChange={e => setEnableContourMapping(e.target.checked)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-contour-mapping-toggle" className="ml-2 block text-sm text-gray-400">
                    Enable/Disable
                  </label>
                </div>
                <div>
                  <label htmlFor="contour-base-freq" className="block text-sm font-medium text-gray-400 mb-1">Base Frequency ({contourBaseFreq.toFixed(3)})</label>
                  <input type="range" id="contour-base-freq" min="0.001" max="0.05" step="0.001" value={contourBaseFreq} onChange={e => setContourBaseFreq(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Fundamental frequency of the contour wavefield</p>
                </div>
                <div>
                  <label htmlFor="contour-amplitude" className="block text-sm font-medium text-gray-400 mb-1">Amplitude ({contourAmplitude.toFixed(1)})</label>
                  <input type="range" id="contour-amplitude" min="0.1" max="3.0" step="0.1" value={contourAmplitude} onChange={e => setContourAmplitude(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Overall strength of the contour wavefield</p>
                </div>
                <div>
                  <label htmlFor="contour-octaves" className="block text-sm font-medium text-gray-400 mb-1">Octaves ({contourOctaves})</label>
                  <input type="range" id="contour-octaves" min="1" max="8" step="1" value={contourOctaves} onChange={e => setContourOctaves(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Number of harmonic layers</p>
                </div>
                <div>
                  <label htmlFor="contour-scale" className="block text-sm font-medium text-gray-400 mb-1">Musical Scale</label>
                  <select id="contour-scale" value={contourScale} onChange={e => setContourScale(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="major">Major Scale (happy, bright)</option>
                    <option value="minor">Minor Scale (sad, dark)</option>
                    <option value="pentatonic">Pentatonic Scale (simple, clean)</option>
                    <option value="chromatic">Chromatic Scale (complex, dissonant)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contour-levels" className="block text-sm font-medium text-gray-400 mb-1">Contour Levels ({contourLevels})</label>
                  <input type="range" id="contour-levels" min="2" max="10" step="1" value={contourLevels} onChange={e => setContourLevels(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Number of contour bands</p>
                </div>
                <div>
                  <label htmlFor="contour-smoothness" className="block text-sm font-medium text-gray-400 mb-1">Smoothness ({contourSmoothness.toFixed(2)})</label>
                  <input type="range" id="contour-smoothness" min="0" max="1" step="0.05" value={contourSmoothness} onChange={e => setContourSmoothness(parseFloat(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1">Smoothness of contour edges</p>
                </div>
              </div>
            </>
          )}

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Visual Presets</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="preset-name" className="block text-sm font-medium text-gray-400 mb-1">Preset Name</label>
              <input
                type="text"
                id="preset-name"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md bg-slate-700 text-white"
                placeholder="e.g., Happy Flow"
              />
            </div>
            <button
              type="button"
              onClick={savePreset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              Save Current as Preset
            </button>
            <div>
              <label htmlFor="load-preset" className="block text-sm font-medium text-gray-400 mb-1">Load Preset</label>
              <select
                id="load-preset"
                onChange={e => loadPreset(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md bg-slate-700 text-white"
              >
                <option value="">-- Select a Preset --</option>
                {presets.map(preset => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={deletePreset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Delete Selected Preset
            </button>
          </div>
        </div>

        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgb(51, 65, 85)', padding: '1rem' }}>
          <h2 className="text-xl font-bold mb-4 text-cyan-300">Live Preview (Canvas)</h2>
          <div className="flex-grow overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-300">Quick Wavefield Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setEnableDensityFields(true);
                    setEnableFlowFields(false);
                    setEnableContourMapping(false);
                    setDensityScale('major');
                    setDensityBaseFreq(0.02);
                    setDensityThreshold(0.3);
                    setDensityIntensity(1.2);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Dots Only
                </button>
                <button
                  onClick={() => {
                    setEnableDensityFields(false);
                    setEnableFlowFields(true);
                    setEnableContourMapping(false);
                    setFlowFieldScale('minor');
                    setFlowFieldBaseFreq(0.015);
                    setFlowLineLength(30);
                    setFlowLineDensity(0.15);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Flow Lines
                </button>
                <button
                  onClick={() => {
                    setEnableDensityFields(false);
                    setEnableFlowFields(false);
                    setEnableContourMapping(true);
                    setContourScale('pentatonic');
                    setContourBaseFreq(0.01);
                    setContourLevels(7);
                    setContourSmoothness(0.5);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Contours
                </button>
                <button
                  onClick={() => {
                    setEnableDensityFields(true);
                    setEnableFlowFields(true);
                    setEnableContourMapping(true);
                    setDensityScale('major');
                    setFlowFieldScale('minor');
                    setContourScale('chromatic');
                    setDensityBaseFreq(0.01);
                    setFlowFieldBaseFreq(0.015);
                    setContourBaseFreq(0.008);
                    setDensityOctaves(4);
                    setFlowFieldOctaves(4);
                    setContourOctaves(6);
                    setDensityAmplitude(1.5);
                    setFlowFieldAmplitude(1.5);
                    setContourAmplitude(1.5);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  All Layers
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={generateImage}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                Refresh Preview
              </button>
            <button
              type="button"
              onClick={handleMint}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Mint NFT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gen2App;

