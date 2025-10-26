
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

  const { writeContract } = useWriteContract();
  const { data: mintPrice } = useReadContract({
    address: GEN2_CONTRACT_ADDRESS,
    abi: gen2ABI,
    functionName: 'mintPrice',
  });


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

    for (let i = 0; i < particleCount; i++) {
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
  }, [particleCount, particleBaseSpeed, particleMinSize, particleMaxSize, particleChaosFactor, enableFarcasterMood, farcasterMood, flowColor1, flowColor2, particleColor1, particleColor2, particleFadeSpeed, particlePattern]);

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

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Flow Field Colors</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="flow-color-1" className="block text-sm font-medium text-gray-400 mb-1">Flow Color 1</label>
              <input type="color" id="flow-color-1" value={flowColor1} onChange={e => setFlowColor1(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
            </div>
            <div>
              <label htmlFor="flow-color-2" className="block text-sm font-medium text-gray-400 mb-1">Flow Color 2</label>
              <input type="color" id="flow-color-2" value={flowColor2} onChange={e => setFlowColor2(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 text-cyan-300">Flow Field Parameters</h2>
          <div className="space-y-4 mb-6">
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
          <p className="text-xs text-gray-500 italic">Note: Flow field parameters currently affect SVG generation only, not live canvas</p>

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Particle Colors</h2>
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
          </div>

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Particle Movement</h2>
          <div className="space-y-4 mb-6">
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
          </div>

          <h2 className="text-xl font-bold mb-4 mt-6 text-cyan-300">Particle Size</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="particle-min-size" className="block text-sm font-medium text-gray-400 mb-1">Min Size ({particleMinSize})</label>
              <input type="range" id="particle-min-size" min="1" max="10" step="1" value={particleMinSize} onChange={e => setParticleMinSize(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <label htmlFor="particle-max-size" className="block text-sm font-medium text-gray-400 mb-1">Max Size ({particleMaxSize})</label>
              <input type="range" id="particle-max-size" min="5" max="20" step="1" value={particleMaxSize} onChange={e => setParticleMaxSize(parseInt(e.target.value))} className="w-full" />
            </div>
          </div>

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
          <div className="mt-6 flex justify-between">
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

