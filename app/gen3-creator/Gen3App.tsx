'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseEther } from 'viem';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { gen2ABI } from './abi';
import dynamic from 'next/dynamic';

// Dynamically import p5 with no SSR
const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
  ssr: false,
});

// Define types for our settings
interface FlowFieldSettings {
  baseFrequency: number;
  amplitude: number;
  color1: string;
  color2: string;
  rotation: number;
  direction: 'clockwise' | 'counterclockwise';
}

interface FlowFieldsSettings {
  baseFrequency: number;
  amplitude: number;
  density: number;
  length: number;
  rotation: number;
  direction: 'clockwise' | 'counterclockwise';
}

interface ContourSettings {
  baseFrequency: number;
  amplitude: number;
  levels: number;
  smoothness: number;
}

interface TraitSettings {
  flowField: FlowFieldSettings;
  flowFields: FlowFieldsSettings;
  contour: ContourSettings;
}

// Default settings
const defaultSettings: TraitSettings = {
  flowField: {
    baseFrequency: 0.02,
    amplitude: 1.0,
    color1: '#4ade80',
    color2: '#22d3ee',
    rotation: 0.5,
    direction: 'clockwise',
  },
  flowFields: {
    baseFrequency: 0.01,
    amplitude: 1.0,
    density: 50,
    length: 20,
    rotation: 0.3,
    direction: 'clockwise',
  },
  contour: {
    baseFrequency: 0.01,
    amplitude: 1.0,
    levels: 5,
    smoothness: 0.3,
  },
};

const DEFAULT_FARCASTER_USER_ID = 'ionoi';
const CONTRACT_ADDRESS_BASE_SEPOLIA = '0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6';
const MINT_PRICE = parseEther('0.001'); // Placeholder - REPLACE WITH ACTUAL MINT PRICE

const Gen3App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [farcasterUserId, setFarcasterUserId] = useState<string>(DEFAULT_FARCASTER_USER_ID);
  const [farcasterMood, setFarcasterMood] = useState<string | null>(null);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [mintCount, setMintCount] = useState<number>(1);

  const { data: hash, writeContract, isPending: isMinting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash,
  });

  const [tokenIdToUpdate, setTokenIdToUpdate] = useState<number | undefined>(undefined);
  const [currentNFTMetadata, setCurrentNFTMetadata] = useState<any | null>(null);
  const [isFetchingNFTMetadata, setIsFetchingNFTMetadata] = useState<boolean>(false);
  const [fetchNFTMetadataError, setFetchNFTMetadataError] = useState<Error | null>(null);

  const publicClient = usePublicClient();

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [isGeneratingRender, setIsGeneratingRender] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isUpdatingOnChain, setIsUpdatingOnChain] = useState<boolean>(false);

  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchStatus, setBatchStatus] = useState<string>('Idle');
  const [lastBatchRunTimestamp, setLastBatchRunTimestamp] = useState<number | null>(null);

  // Layer toggles
  const [enableFlowField, setEnableFlowField] = useState(true);
  const [enableFlowFields, setEnableFlowFields] = useState(true);
  const [enableContourMapping, setEnableContourMapping] = useState(true);
  const [contourAffectsFlow, setContourAffectsFlow] = useState(true);

  // Data Source Toggles
  const [enableFarcasterMood, setEnableFarcasterMood] = useState(false);
  const [enableNeighborAssociations, setEnableNeighborAssociations] = useState(false);
  const [enableTokenTransactions, setEnableTokenTransactions] = useState(false);
  const [enableWalletHoldings, setEnableWalletHoldings] = useState(false);

  // Flow Field (background) parameters
  const [flowFieldBaseFreq, setFlowFieldBaseFreq] = useState(0.02);
  const [flowFieldAmplitude, setFlowFieldAmplitude] = useState(1.0);
  const [flowFieldOctaves, setFlowFieldOctaves] = useState(4);
  const [flowColor1, setFlowColor1] = useState('#4ade80');
  const [flowColor2, setFlowColor2] = useState('#22d3ee');
  const [flowFieldRotation, setFlowFieldRotation] = useState(0); // degrees
  const [flowFieldDirection, setFlowFieldDirection] = useState(1); // 1 = clockwise, -1 = counterclockwise

  // FlowFields (lines) parameters
  const [flowFieldsBaseFreq, setFlowFieldsBaseFreq] = useState(0.01);
  const [flowFieldsAmplitude, setFlowFieldsAmplitude] = useState(1.0);
  const [flowFieldsOctaves, setFlowFieldsOctaves] = useState(4);
  const [flowLineLength, setFlowLineLength] = useState(20);
  const [flowLineDensity, setFlowLineDensity] = useState(0.1);
  const [flowFieldsRotation, setFlowFieldsRotation] = useState(0); // degrees
  const [flowFieldsDirection, setFlowFieldsDirection] = useState(1); // 1 = clockwise, -1 = counterclockwise

  // Contour Mapping parameters
  const [contourBaseFreq, setContourBaseFreq] = useState(0.01);
  const [contourAmplitude, setContourAmplitude] = useState(1.0);
  const [contourOctaves, setContourOctaves] = useState(4);
  const [contourLevels, setContourLevels] = useState(5);
  const [contourSmoothness, setContourSmoothness] = useState(0.3);

  const handleGenerateNewRender = useCallback(async () => {
    setIsGeneratingRender(true);
    setGeneratedImageUrl(null);
    // Placeholder for actual rendering logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
    setGeneratedImageUrl('https://via.placeholder.com/500x500.png?text=New+Render'); // Dummy URL
    setIsGeneratingRender(false);
  }, []);

  const handleUploadToIPFS = useCallback(async () => {
    if (!generatedImageUrl) return;
    setIsUploadingToIPFS(true);
    setIpfsUrl(null);
    // Placeholder for actual IPFS upload logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
    setIpfsUrl('ipfs://dummyhash/new_render.json'); // Dummy IPFS URL
    setIsUploadingToIPFS(false);
  }, [generatedImageUrl]);

  const handleUpdateOnChain = useCallback(async () => {
    if (!tokenIdToUpdate || !ipfsUrl) return;
    setIsUpdatingOnChain(true);
    // Placeholder for actual on-chain update logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
    console.log(`Updating NFT ${tokenIdToUpdate} with IPFS URL: ${ipfsUrl}`);
    setIsUpdatingOnChain(false);
  }, [tokenIdToUpdate, ipfsUrl]);

  const handleRunBatchUpdateScript = useCallback(async () => {
    setIsBatchRunning(true);
    setBatchStatus('Running...');
    // Placeholder for actual batch script execution
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate async operation
    setBatchStatus('Complete');
    setLastBatchRunTimestamp(Date.now());
    setIsBatchRunning(false);
  }, []);

  const handleClearOverrides = useCallback(() => {
    setFlowColor1('#4ade80'); // Default color 1
    setFlowColor2('#22d3ee'); // Default color 2
  }, []);

  const handleResetFrequency = useCallback(() => {
    setFlowFieldBaseFreq(0.02); // Default base frequency
  }, []);

  const handleResetLevels = useCallback(() => {
    setContourLevels(5); // Default contour levels
  }, []);

  const handleApplyToCurrentNFT = useCallback(() => {
    if (!currentNFTMetadata) {
      alert('Please fetch an NFT first to apply overrides.');
      return;
    }
    // For now, just log the current settings that would be applied
    const currentSettings = {
      flowField: {
        color1: flowColor1,
        color2: flowColor2,
        baseFreq: flowFieldBaseFreq,
      },
      contour: {
        levels: contourLevels,
      },
      // ... other relevant settings
    };
    console.log('Applying current settings to NFT:', currentNFTMetadata.tokenId, currentSettings);
    alert('Settings applied (logged to console). Next, you would generate a new render, upload to IPFS, and update on-chain.');
  }, [currentNFTMetadata, flowColor1, flowColor2, flowFieldBaseFreq, contourLevels]);

  const handleFetchNFTMetadata = useCallback(async () => {
    if (tokenIdToUpdate === undefined) return;

    setIsFetchingNFTMetadata(true);
    setFetchNFTMetadataError(null);
    setCurrentNFTMetadata(null);

    try {
      // First, get the tokenURI from the contract
      const tokenURIResult: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS_BASE_SEPOLIA,
        abi: gen2ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenIdToUpdate)],
      });

      if (tokenURIResult) {
        // Assuming tokenURIResult is a string URL
        const response = await fetch(tokenURIResult);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const metadata = await response.json();
        setCurrentNFTMetadata(metadata);
      } else {
        throw new Error('Token URI not found.');
      }
    } catch (err: any) {
      console.error('Error fetching NFT metadata:', err);
      setFetchNFTMetadataError(err);
    } finally {
      setIsFetchingNFTMetadata(false);
    }
  }, [tokenIdToUpdate, publicClient]);

  // Fetch Farcaster mood
  const fetchFarcasterMood = useCallback(async () => {
    if (!enableFarcasterMood) {
      setFarcasterMood(null);
      return;
    }
    try {
      const response = await fetch('/api/gen2/farcaster-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: farcasterUserId }),
      });

      if (response.ok) {
        const { mood } = await response.json();
        setFarcasterMood(mood);
      } else {
        console.error('Error fetching Farcaster mood:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching Farcaster mood:', error);
    }
  }, [farcasterUserId, enableFarcasterMood]);

  // Wavefield value functions
  const getFlowFieldWavefieldValue = (x: number, y: number, t: number): number => {
    let value = 0;
    for (let octave = 0; octave < flowFieldOctaves; octave++) {
      const freq = flowFieldBaseFreq * Math.pow(2, octave);
      const amplitude = flowFieldAmplitude / Math.pow(2, octave);
      const phase = t * 0.01;
      value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
    }

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

  const getFlowFieldsWavefieldValue = (x: number, y: number, t: number): number => {
    let value = 0;
    for (let octave = 0; octave < flowFieldsOctaves; octave++) {
      const freq = flowFieldsBaseFreq * Math.pow(2, octave);
      const amplitude = flowFieldsAmplitude / Math.pow(2, octave);
      const phase = t * 0.01;
      value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
    }

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

  const getContourWavefieldValue = (x: number, y: number, t: number): number => {
    let value = 0;
    for (let octave = 0; octave < contourOctaves; octave++) {
      const freq = contourBaseFreq * Math.pow(2, octave);
      const amplitude = contourAmplitude / Math.pow(2, octave);
      const phase = t * 0.01;
      value += amplitude * Math.sin(x * freq + phase) * Math.cos(y * freq + phase);
    }

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

  // Render Flow Fields (lines)
  const renderFlowFields = (ctx: CanvasRenderingContext2D, size: number, t: number) => {
    if (!enableFlowFields) return;

    const gridSize = Math.floor(size * flowLineDensity);
    const cellSize = size / gridSize;
    const rotationRad = (flowFieldsRotation * Math.PI) / 180;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;

    for (let py = 0; py < gridSize; py++) {
      for (let px = 0; px < gridSize; px++) {
        const x = px * cellSize;
        const y = py * cellSize;
        const eps = 1;
        let gradX, gradY;

        if (contourAffectsFlow && enableContourMapping) {
          const contourValue = getContourWavefieldValue(x, y, t);
          gradX = getContourWavefieldValue(x + eps, y, t) - contourValue;
          gradY = getContourWavefieldValue(x, y + eps, t) - contourValue;

          const flowFieldsValue = getFlowFieldsWavefieldValue(x, y, t);
          const flowFieldsGradX = getFlowFieldsWavefieldValue(x + eps, y, t) - flowFieldsValue;
          const flowFieldsGradY = getFlowFieldsWavefieldValue(x, y + eps, t) - flowFieldsValue;

          gradX = (gradX + flowFieldsGradX) / 2;
          gradY = (gradY + flowFieldsGradY) / 2;
        } else {
          const flowFieldsValue = getFlowFieldsWavefieldValue(x, y, t);
          gradX = getFlowFieldsWavefieldValue(x + eps, y, t) - flowFieldsValue;
          gradY = getFlowFieldsWavefieldValue(x, y + eps, t) - flowFieldsValue;
        }

        const length = Math.sqrt(gradX * gradX + gradY * gradY);
        if (length > 0) {
          let dirX = gradX / length;
          let dirY = gradY / length;

          // Apply rotation
          const rotatedDirX = dirX * Math.cos(rotationRad) - dirY * Math.sin(rotationRad);
          const rotatedDirY = dirX * Math.sin(rotationRad) + dirY * Math.cos(rotationRad);

          // Apply direction
          const finalDirX = rotatedDirX * flowFieldsDirection;
          const finalDirY = rotatedDirY * Math.abs(flowFieldsDirection); // Only apply to x for proper direction

          const startX = x + cellSize / 2;
          const startY = y + cellSize / 2;
          const endX = startX + finalDirX * flowLineLength;
          const endY = startY + finalDirY * flowLineLength;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    }
  };

  // Render Contour Mapping
  const renderContourMapping = (ctx: CanvasRenderingContext2D, size: number, t: number) => {
    if (!enableContourMapping) return;

    const gridSize = 64;
    const cellSize = size / gridSize;
    const levels: number[] = [];
    for (let i = 0; i < contourLevels; i++) {
      levels.push((i / contourLevels) * 2 - 1);
    }

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

          const nextLevel = levelIndex < levels.length - 1 ? levels[levelIndex + 1] : 1;
          if (waveValue >= level && waveValue < nextLevel) {
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
    ctx.globalAlpha = 1;
  };

  const handleExportSettings = () => {
    const settings = {
      flowField: {
        enabled: enableFlowField,
        baseFreq: flowFieldBaseFreq,
        amplitude: flowFieldAmplitude,
        octaves: flowFieldOctaves,
        color1: flowColor1,
        color2: flowColor2,
        rotation: flowFieldRotation,
        direction: flowFieldDirection,
      },
      flowFields: {
        enabled: enableFlowFields,
        baseFreq: flowFieldsBaseFreq,
        amplitude: flowFieldsAmplitude,
        octaves: flowFieldsOctaves,
        lineLength: flowLineLength,
        lineDensity: flowLineDensity,
        rotation: flowFieldsRotation,
        direction: flowFieldsDirection,
      },
      contour: {
        enabled: enableContourMapping,
        baseFreq: contourBaseFreq,
        amplitude: contourAmplitude,
        octaves: contourOctaves,
        levels: contourLevels,
        smoothness: contourSmoothness,
      },
      dataSources: {
        farcasterMood: enableFarcasterMood,
        neighborAssociations: enableNeighborAssociations,
        tokenTransactions: enableTokenTransactions,
        walletHoldings: enableWalletHoldings,
      },
      contourAffectsFlow,
    };

    const jsonStr = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(jsonStr);
    alert('Settings copied! Use for batch rendering. These become the BASE settings.\n\nLATER: You can modify colors/params based on holder data and rerender!');
    console.log('=== GEN3 BASE SETTINGS FOR BATCH RENDERING ===');
    console.log('Use these for initial mint. Then modify params based on holder activity!');
    console.log(jsonStr);

    // Also log examples of how to modify
    console.log('\n=== EXAMPLE: HOW TO MODIFY FOR INDIVIDUAL HOLDERS ===');
    console.log('// Read holder data (Farcaster posts, on-chain activity, etc.)');
    console.log('// Modify specific parameters based on data:');
    console.log('// settings.flowField.color1 = analyzePosts(posts).sentiment1;');
    console.log('// settings.flowField.color2 = analyzePosts(posts).sentiment2;');
    console.log('// Rerender NFT with modified settings');
    console.log('// Update NFT metadata on-chain');
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

    const LOOP_DURATION = 300;
    let frame = 0;
    let animationFrame: number;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Render Flow Field background - smooth gradient without grid
      if (enableFlowField) {
        // Create smooth gradient without visible grid
        const imageData = ctx.createImageData(size, size);
        const r1 = parseInt(flowColor1.slice(1, 3), 16);
        const g1 = parseInt(flowColor1.slice(3, 5), 16);
        const b1 = parseInt(flowColor1.slice(5, 7), 16);
        const r2 = parseInt(flowColor2.slice(1, 3), 16);
        const g2 = parseInt(flowColor2.slice(3, 5), 16);
        const b2 = parseInt(flowColor2.slice(5, 7), 16);

        const rotationRad = (flowFieldRotation * Math.PI) / 180;
        const centerX = size / 2;
        const centerY = size / 2;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;

            // Apply rotation
            const dx = x - centerX;
            const dy = y - centerY;
            const rotatedX = dx * Math.cos(rotationRad) - dy * Math.sin(rotationRad);
            const rotatedY = dx * Math.sin(rotationRad) + dy * Math.cos(rotationRad);

            const timeComponent = frame * 0.1 * flowFieldDirection;
            const noise = Math.sin(rotatedX * flowFieldBaseFreq * 20 * flowFieldOctaves + timeComponent) *
                         Math.cos(rotatedY * flowFieldBaseFreq * 20 * flowFieldOctaves + timeComponent);
            const factor = (noise + 1) / 2;

            imageData.data[index] = Math.round(r1 + (r2 - r1) * factor);
            imageData.data[index + 1] = Math.round(g1 + (g2 - g1) * factor);
            imageData.data[index + 2] = Math.round(b1 + (b2 - b1) * factor);
            imageData.data[index + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      renderFlowFields(ctx, size, frame);
      renderContourMapping(ctx, size, frame);

      frame++;
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [enableFlowField, enableFlowFields, enableContourMapping, contourAffectsFlow, flowFieldBaseFreq, flowFieldAmplitude, flowFieldOctaves, flowColor1, flowColor2, flowFieldRotation, flowFieldDirection, flowFieldsBaseFreq, flowFieldsAmplitude, flowFieldsOctaves, flowFieldsRotation, flowFieldsDirection, flowLineLength, flowLineDensity, contourBaseFreq, contourAmplitude, contourOctaves, contourLevels, contourSmoothness, enableFarcasterMood, farcasterMood]);

  useEffect(() => {
    fetchFarcasterMood();
  }, [fetchFarcasterMood]);

  // p5.js setup and draw functions
  const setup = (p5: any, canvasParentRef: Element) => {
    p5.createCanvas(800, 600).parent(canvasParentRef);
    p5.background(0);
  };

  const draw = (p5: any) => {
    p5.background(0, 5); // Slight fade for trails
    p5.translate(p5.width / 2, p5.height / 2);

    // Add your drawing code here
    p5.fill(255);
    p5.ellipse(0, 0, 50, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200 font-sans">
      <header className="bg-slate-800 p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-cyan-400">Gen3 NFT Studio</h1>
        <p className="text-slate-400">Design animated Mood Ring NFTs - Flow Field, FlowFields, and Contour Mapping</p>
      </header>
      <main className="grid grid-cols-4 gap-4 p-4 min-h-screen-minus-header">
        {/* Canvas Card - Spans 2 columns */}
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">CANVAS (Live Loop)</h2>
          <div className="flex-grow overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center">
            <Sketch
              setup={setup}
              draw={draw}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Layer Controls Card - Right Column Top */}
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4 overflow-y-auto max-h-[50vh]">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">Layer Controls</h2>
          {/* Layer controls content will go here */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Flow Field</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enableFlowField}
                    onChange={(e) => setEnableFlowField(e.target.checked)}
                    className="mr-2"
                  />
                  Enable Flow Field
                </label>
                {/* Add more controls for Flow Field */}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Flow Fields</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enableFlowFields}
                    onChange={(e) => setEnableFlowFields(e.target.checked)}
                    className="mr-2"
                  />
                  Enable Flow Fields
                </label>
                {/* Add more controls for Flow Fields */}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contour Mapping</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enableContourMapping}
                    onChange={(e) => setEnableContourMapping(e.target.checked)}
                    className="mr-2"
                  />
                  Enable Contour Mapping
                </label>
                {/* Add more controls for Contour Mapping */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Gen3App;
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1 style={{ textAlign: 'center' }}>GEN3 NFT DESIGN STUDIO</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>CANVAS (Live Loop)</h3>
            <div ref={sketchRef} style={{ border: '1px solid #ccc', width: '100%', height: '300px' }}></div>
          </div>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>BASE SETTINGS</h3>
            <button>Export</button>
            <button style={{ marginLeft: '8px' }}>Save</button>
          </div>
        </div>

        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>LAYER CONTROLS</h3>
            <div>
              <h4>Flow Field (Background)</h4>
              {Object.entries(settings.flowField).map(([key, value]) => (
                <div key={key}>
                  <label>{key}: </label>
                  <input
                    type={typeof value === 'number' ? 'range' : 'text'}
                    min={typeof value === 'number' ? 0 : undefined}
                    max={typeof value === 'number' ? (key === 'rotation' ? 360 : 2) : undefined}
                    step={typeof value === 'number' ? 0.01 : undefined}
                    value={value}
                    onChange={(e) =>
                      handleInputChange('flowField', key, typeof value === 'number' ? parseFloat(e.target.value) : e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            <div>
              <h4>FlowFields (Lines)</h4>
              {Object.entries(settings.flowFields).map(([key, value]) => (
                <div key={key}>
                  <label>{key}: </label>
                  <input
                    type={typeof value === 'number' ? 'range' : 'text'}
                    min={0}
                    max={key === 'density' ? 100 : (key === 'rotation' ? 360 : 2)}
                    step={0.01}
                    value={value}
                    onChange={(e) =>
                      handleInputChange('flowFields', key, parseFloat(e.target.value))
                    }
                  />
                </div>
              ))}
            </div>
            <div>
              <h4>Contour Mapping</h4>
              {Object.entries(settings.contour).map(([key, value]) => (
                <div key={key}>
                  <label>{key}: </label>
                  <input
                    type="range"
                    min={0}
                    max={key === 'levels' ? 20 : 2}
                    step={0.01}
                    value={value}
                    onChange={(e) =>
                      handleInputChange('contour', key, parseFloat(e.target.value))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>DATA INFLUENCE MODIFIERS</h3>
            <div>
              <input type="checkbox" id="farcaster" defaultChecked />
              <label htmlFor="farcaster">Farcaster</label>
              <div>
                <input type="text" value={fid} onChange={handleFidChange} placeholder="Enter Farcaster ID" />
                <button onClick={handleFetchMood}>Fetch Mood</button>
              </div>
            </div>
            <div>
              <input type="checkbox" id="neighbor" />
              <label htmlFor="neighbor">Neighbor</label>
            </div>
            <div>
              <input type="checkbox" id="txns" />
              <label htmlFor="txns">Txns</label>
            </div>
            <div>
              <input type="checkbox" id="holdings" />
              <label htmlFor="holdings">Holdings</label>
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>MANUAL OVERRIDES</h3>
            <p>Color Override, Freq Override, etc.</p>
            <button>Apply</button>
          </div>
        </div>

        {/* Column 4 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>ON-CHAIN ACTIONS</h3>
            {isConnected ? (
              <div>
                <p>Connected: {address}</p>
                <button onClick={() => disconnect()}>Disconnect</button>
              </div>
            ) : (
              <button onClick={() => connect({ connector: connectors[0] })}>
                Connect Wallet
              </button>
            )}
            <div style={{ marginTop: '12px' }}>
              <h4>Mint New</h4>
              <input type="text" placeholder="To Address" style={{ width: '100%', boxSizing: 'border-box' }} />
              <input type="number" placeholder="Count" defaultValue="1" style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px' }} />
              <button style={{ marginTop: '8px' }}>Mint to Address</button>
            </div>
            <div style={{ marginTop: '12px' }}>
              <h4>Update Existing</h4>
              <input type="number" placeholder="Token ID" style={{ width: '100%', boxSizing: 'border-box' }} />
              <button style={{ marginTop: '8px' }}>Fetch Current</button>
              <button style={{ marginTop: '8px' }}>Generate New Render</button>
              <button style={{ marginTop: '8px' }}>Upload to IPFS</button>
              <button style={{ marginTop: '8px' }}>Update On-Chain</button>
            </div>
             <div style={{ marginTop: '12px' }}>
              <h4>Batch Operations</h4>
              <button>Run Batch Update Script</button>
              <p>Status: Idle</p>
            </div>
          </div>
           <div style={cardStyle}>
            <h3 style={cardHeaderStyle}>DATA SOURCES LEGEND</h3>
            <p>✅ Farcaster Mood API</p>
            <p>✅ Neynar User Data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gen3App;

        </div>

        {/* Data Influence Modifiers Card - Right Column Bottom */}
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4 overflow-y-auto max-h-[50vh]">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">DATA INFLUENCE MODIFIERS</h2>
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
                ☑ Farcaster Mood
              </label>
            </div>
            {enableFarcasterMood && (
              <div className="ml-6 space-y-2">
                <div>
                  <label htmlFor="farcaster-user-id" className="block text-xs font-medium text-gray-500 mb-1">
                    User ID
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
                  <p className="text-xs text-gray-400">Mood: <span className="font-semibold text-cyan-400">{farcasterMood}</span></p>
                )}
                <div className="text-xs text-gray-500">
                  <label htmlFor="farcaster-mood-dropdown" className="block text-xs font-medium text-gray-500 mb-1">Posts to analyze:</label>
                  <select id="farcaster-mood-dropdown" className="w-full bg-slate-700 text-white px-2 py-1 rounded-md border border-slate-600">
                    <option>Last 10</option>
                    <option>Last 100</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <input id="enable-neighbor-associations" type="checkbox" checked={enableNeighborAssociations} onChange={e => setEnableNeighborAssociations(e.target.checked)} className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded" />
              <label htmlFor="enable-neighbor-associations" className="ml-2 block text-sm text-gray-400">☐ Neighbor Associations (Coming Soon)</label>
            </div>
            <div className="flex items-center">
              <input id="enable-token-transactions" type="checkbox" checked={enableTokenTransactions} onChange={e => setEnableTokenTransactions(e.target.checked)} className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded" />
              <label htmlFor="enable-token-transactions" className="ml-2 block text-sm text-gray-400">☐ Token Transactions (Coming Soon)</label>
            </div>
            <div className="flex items-center">
              <input id="enable-wallet-holdings" type="checkbox" checked={enableWalletHoldings} onChange={e => setEnableWalletHoldings(e.target.checked)} className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded" />
              <label htmlFor="enable-wallet-holdings" className="ml-2 block text-sm text-gray-400">☐ Wallet Holdings (Coming Soon)</label>
            </div>
          </div>
        </div>

        {/* Base Settings Card - Left Bottom 1 */}
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">BASE SETTINGS</h2>
          <div className="mt-auto">
            <button
              onClick={handleExportSettings}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded transition-colors duration-200"
            >
              Export Settings
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Copy parameters for batch rendering
            </p>
          </div>
        </div>

        {/* Manual Overrides Card - Left Bottom 2 */}
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">MANUAL OVERRIDES</h2>
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-2 text-cyan-300">Color Overrides</h3>
            <div>
              <label htmlFor="override-color-1" className="block text-sm font-medium text-gray-400 mb-1">Override Color 1</label>
              <input type="color" id="override-color-1" value={flowColor1} onChange={e => setFlowColor1(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
            </div>
            <div>
              <label htmlFor="override-color-2" className="block text-sm font-medium text-gray-400 mb-1">Override Color 2</label>
              <input type="color" id="override-color-2" value={flowColor2} onChange={e => setFlowColor2(e.target.value)} className="w-full h-10 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
            </div>
            <button onClick={handleClearOverrides} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">Clear Overrides</button>

            <h3 className="text-lg font-bold mt-6 mb-2 text-cyan-300">Frequency Override</h3>
            <div>
              <label htmlFor="override-base-freq" className="block text-sm font-medium text-gray-400 mb-1">Base Freq ({flowFieldBaseFreq.toFixed(3)})</label>
              <input type="range" id="override-base-freq" min="0.001" max="0.05" step="0.001" value={flowFieldBaseFreq} onChange={e => setFlowFieldBaseFreq(parseFloat(e.target.value))} className="w-full" />
            </div>
            <button onClick={handleResetFrequency} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">Reset to Data Source</button>

            <h3 className="text-lg font-bold mt-6 mb-2 text-cyan-300">Levels Override</h3>
            <div>
              <label htmlFor="override-contour-levels" className="block text-sm font-medium text-gray-400 mb-1">Contour Levels ({contourLevels})</label>
              <input type="range" id="override-contour-levels" min="2" max="10" step="1" value={contourLevels} onChange={e => setContourLevels(parseInt(e.target.value))} className="w-full" />
            </div>
            <button onClick={handleResetLevels} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">Reset</button>

            <button onClick={handleApplyToCurrentNFT} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded transition-colors duration-200 mt-6">Apply to Current NFT</button>
          </div>
        </div>

        {/* On-Chain Actions Card - Left Bottom 3 */}
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 overflow-y-auto max-h-[60vh]">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">ON-CHAIN ACTIONS</h2>
          <div className="space-y-4">
            {!isConnected && (
              <div className="flex flex-col space-y-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                  >
                    Connect {connector.name}
                  </button>
                ))}
                {status === 'pending' && <p className="text-sm text-gray-400">Connecting...</p>}
                {error && <p className="text-sm text-red-400">Error: {error.message}</p>}
              </div>
            )}

            {isConnected && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Connected: <span className="font-semibold text-cyan-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span></p>
                <p className="text-sm text-gray-400">Network: <span className="font-semibold text-cyan-400">Base Sepolia (Test)</span></p>
                <button
                  onClick={() => disconnect()}
                  type="button"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                >
                  Disconnect
                </button>
              </div>
            )}

            <h3 className="text-lg font-bold mt-6 mb-2 text-cyan-300">Mint New NFT</h3>
            {isConnected ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="destination-address" className="block text-sm font-medium text-gray-400 mb-1">To Address:</label>
                  <input
                    type="text"
                    id="destination-address"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="0x..."
                    className="block w-full pl-2 pr-2 py-1 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="mint-count" className="block text-sm font-medium text-gray-400 mb-1">Count (1-10):</label>
                  <input
                    type="number"
                    id="mint-count"
                    value={mintCount}
                    onChange={(e) => setMintCount(Math.max(1, Math.min(10, parseInt(e.target.value))))}
                    min="1"
                    max="10"
                    className="block w-full pl-2 pr-2 py-1 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => writeContract({
                    address: CONTRACT_ADDRESS_BASE_SEPOLIA,
                    abi: gen2ABI,
                    functionName: 'mint',
                    args: ['https://placeholder.com/image.gif', 'https://placeholder.com/metadata.json'], // Using mint(imageUrl, metadataJSON) from ABI
                    value: (BigInt(mintCount) * MINT_PRICE) as bigint,
                  } as any)}
                  disabled={!isConnected || !destinationAddress || mintCount < 1 || mintCount > 10 || isMinting || isConfirming}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? 'Minting...' : isConfirming ? 'Confirming...' : 'Mint to Connected Wallet'}
                </button>
                <p className="text-sm text-yellow-400">Note: Current contract ABI only supports minting to the connected wallet. 'To Address' field is for future transfer functionality or contract update.</p>
                {hash && <p className="text-sm text-gray-400">Transaction Hash: <a href={`https://sepolia.basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{hash.slice(0, 6)}...{hash.slice(-4)}</a></p>}
                {isConfirming && <p className="text-sm text-gray-400">Waiting for confirmation...</p>}
                {isConfirmed && <p className="text-sm text-green-400">Mint successful!</p>}
                {confirmError && <p className="text-sm text-red-400">Error confirming transaction: {confirmError.message}</p>}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Connect wallet to mint NFTs.</p>
            )}

            <h3 className="text-lg font-bold mt-6 mb-2 text-cyan-300">Update Existing NFT</h3>
            {isConnected ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="token-id-to-update" className="block text-sm font-medium text-gray-400 mb-1">Token ID:</label>
                  <input
                    type="number"
                    id="token-id-to-update"
                    value={tokenIdToUpdate}
                    onChange={(e) => setTokenIdToUpdate(parseInt(e.target.value))}
                    min="1"
                    className="block w-full pl-2 pr-2 py-1 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchNFTMetadata}
                  disabled={!tokenIdToUpdate || isFetchingNFTMetadata}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingNFTMetadata ? 'Fetching...' : 'Fetch Current Settings'}
                </button>
                {currentNFTMetadata && (
                  <div className="bg-slate-800 p-3 rounded-md text-xs text-gray-400 overflow-x-auto">
                    <p className="font-semibold text-cyan-400 mb-1">Current Metadata:</p>
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(currentNFTMetadata, null, 2)}</pre>
                  </div>
                )}
                {fetchNFTMetadataError && <p className="text-sm text-red-400">Error fetching metadata: {fetchNFTMetadataError.message}</p>}

                <button
                  type="button"
                  onClick={handleGenerateNewRender}
                  disabled={!tokenIdToUpdate || isGeneratingRender || isUploadingToIPFS || isUpdatingOnChain}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingRender ? 'Generating...' : 'Generate New Render'}
                </button>
                {generatedImageUrl && <p className="text-sm text-gray-400">Render Generated: <a href={generatedImageUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">View Image</a></p>}

                <button
                  type="button"
                  onClick={handleUploadToIPFS}
                  disabled={!generatedImageUrl || isUploadingToIPFS || isUpdatingOnChain}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingToIPFS ? 'Uploading...' : 'Upload to IPFS'}
                </button>
                {ipfsUrl && <p className="text-sm text-gray-400">IPFS URL: <a href={`https://ipfs.io/ipfs/${ipfsUrl.split('://')[1]}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{ipfsUrl}</a></p>}

                <button
                  type="button"
                  onClick={handleUpdateOnChain}
                  disabled={!ipfsUrl || isUpdatingOnChain}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingOnChain ? 'Updating...' : 'Update On-Chain'}
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Connect wallet to update NFTs.</p>
            )}

            <h3 className="text-lg font-bold mt-6 mb-2 text-cyan-300">Batch Operations</h3>
            {isConnected ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRunBatchUpdateScript}
                  disabled={isBatchRunning}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBatchRunning ? 'Running Batch...' : 'Run Batch Update Script'}
                </button>
                <p className="text-sm text-gray-400">Status: <span className="font-semibold text-cyan-400">{batchStatus}</span></p>
                {lastBatchRunTimestamp && <p className="text-sm text-gray-400">Last Run: <span className="font-semibold text-cyan-400">{new Date(lastBatchRunTimestamp).toLocaleString()}</span></p>}
                <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">View Logs (Coming Soon)</button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Connect wallet to run batch operations.</p>
            )}
          </div>
        </div>

        {/* Data Sources Legend Card - Full Width Bottom */}
        <div className="col-span-4 bg-slate-800 rounded-lg border border-slate-600 p-4">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">DATA SOURCES LEGEND</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✅</span>
              <div>
                <strong className="text-cyan-400">Farcaster Mood</strong>
                <p className="text-gray-500 text-xs">API: `/api/gen2/farcaster-mood` - Analyzes post sentiment</p>
                <p className="text-gray-500 text-xs">Available: post text, sentiment analysis, cast count</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✅</span>
              <div>
                <strong className="text-cyan-400">Neynar User Data</strong>
                <p className="text-gray-500 text-xs">API: `/api/neynar/user` - Full Farcaster profile</p>
                <p className="text-gray-500 text-xs">Available: follower count, following, casts, verifications</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✅</span>
              <div>
                <strong className="text-cyan-400">On-Chain NFT Data</strong>
                <p className="text-gray-500 text-xs">API: `/api/user-nfts` - Holder's NFT collection</p>
                <p className="text-gray-500 text-xs">Available: token count, collection size</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✅</span>
              <div>
                <strong className="text-cyan-400">Contract State</strong>
                <p className="text-gray-500 text-xs">Functions: `ownerOf()`, `balanceOf()`</p>
                <p className="text-gray-500 text-xs">Available: token ownership, holder balance</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-blue-400 mr-2">🔧</span>
              <div>
                <strong className="text-cyan-400">Metadata Update</strong>
                <p className="text-gray-500 text-xs">Function: `updateMetadata(tokenId, newMetadataJSON)`</p>
                <p className="text-gray-500 text-xs">Use this to: Update image URL & attributes after rerender</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-yellow-400 mr-2">⏳</span>
              <div>
                <strong className="text-cyan-400">Transaction History</strong>
                <p className="text-gray-500 text-xs">Status: Need to implement</p>
                <p className="text-gray-500 text-xs">Would provide: activity level, transaction types</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-yellow-400 mr-2">⏳</span>
              <div>
                <strong className="text-cyan-400">Token Holdings</strong>
                <p className="text-gray-500 text-xs">Status: Need to implement</p>
                <p className="text-gray-500 text-xs">Would provide: ERC20/ERC721 portfolio value</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gen3App;

