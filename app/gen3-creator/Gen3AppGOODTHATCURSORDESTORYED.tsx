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
const MINT_PRICE = parseEther('0.001');

const Gen3App: React.FC = () => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // State for settings and UI
  const [settings, setSettings] = useState<TraitSettings>(defaultSettings);
  const [farcasterUserId, setFarcasterUserId] = useState<string>(DEFAULT_FARCASTER_USER_ID);
  const [farcasterMood, setFarcasterMood] = useState<string | null>(null);
  const [enableFlowField, setEnableFlowField] = useState<boolean>(true);
  const [enableFlowFields, setEnableFlowFields] = useState<boolean>(true);
  const [enableContourMapping, setEnableContourMapping] = useState<boolean>(true);
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  // Minting state
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [mintCount, setMintCount] = useState<number>(1);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<Error | null>(null);
  
  // NFT Update state
  const [tokenIdToUpdate, setTokenIdToUpdate] = useState<string>('');
  const [currentNFTMetadata, setCurrentNFTMetadata] = useState<any>(null);
  const [isFetchingNFTMetadata, setIsFetchingNFTMetadata] = useState<boolean>(false);
  const [fetchNFTMetadataError, setFetchNFTMetadataError] = useState<Error | null>(null);
  const [isGeneratingRender, setIsGeneratingRender] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isUpdatingOnChain, setIsUpdatingOnChain] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [ipfsUrl, setIpfsUrl] = useState<string>('');
  
  // Batch update state
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [lastBatchRunTimestamp, setLastBatchRunTimestamp] = useState<number | null>(null);
  
  // Contract interaction
  const { data: hash, writeContract } = useWriteContract();
  const { 
    data: receipt, 
    isError: isTxError, 
    isLoading: isTxLoading 
  } = useWaitForTransactionReceipt({ hash });

  // Handle transaction confirmation
  useEffect(() => {
    if (hash && !isTxLoading && !isTxError && receipt) {
      setIsConfirmed(true);
      setIsMinting(false);
      setIsConfirming(false);
    } else if (isTxError) {
      setConfirmError(new Error('Transaction failed'));
      setIsMinting(false);
      setIsConfirming(false);
    }
  }, [hash, isTxLoading, isTxError, receipt]);

  // Fetch Farcaster mood
  const getFarcasterMood = async (fid: string): Promise<string> => {
    // Mock implementation - replace with actual API call
    return 'happy';
  };

  const handleFetchMood = async () => {
    try {
      const mood = await getFarcasterMood(farcasterUserId);
      setFarcasterMood(mood);
      
      // Update settings based on mood
      const newSettings = { ...settings };
      if (mood === 'happy') {
        newSettings.flowField.color1 = '#4ade80';
        newSettings.flowField.color2 = '#22d3ee';
      } else if (mood === 'sad') {
        newSettings.flowField.color1 = '#3b82f6';
        newSettings.flowField.color2 = '#8b5cf6';
      } else {
        newSettings.flowField.color1 = '#ffffff';
        newSettings.flowField.color2 = '#d1d5db';
      }
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching Farcaster mood:', error);
    }
  };

  // Handle settings changes
  const handleInputChange = (
    category: keyof TraitSettings,
    key: string,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let time = 0;
    
    const render = () => {
      if (!ctx) return;
      
      const { width, height } = canvas;
      const size = Math.min(width, height);
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      
      // Save context
      ctx.save();
      ctx.translate(width / 2, height / 2);
      
      // Render layers based on toggles
      if (enableFlowField) {
        // renderFlowField(ctx, size, time);
      }
      
      if (enableFlowFields) {
        // renderFlowFields(ctx, size, time);
      }
      
      if (enableContourMapping) {
        // renderContourMapping(ctx, size, time);
      }
      
      // Restore context
      ctx.restore();
      
      // Update time
      time += 0.01;
      
      // Request next frame
      animationFrameId = requestAnimationFrame(render);
    };
    
    // Start animation
    render();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enableFlowField, enableFlowFields, enableContourMapping]);

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

  // Render the component
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200 font-sans">
      <header className="bg-slate-800 p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-cyan-400">Gen3 NFT Studio</h1>
        <p className="text-slate-400">Design animated Mood Ring NFTs - Flow Field, FlowFields, and Contour Mapping</p>
      </header>
      
      <main className="grid grid-cols-4 gap-4 p-4">
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
          
          <div className="space-y-4">
            {/* Flow Field Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="flow-field-toggle"
                checked={enableFlowField}
                onChange={(e) => setEnableFlowField(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="flow-field-toggle" className="ml-2 text-sm font-medium text-gray-300">
                Enable Flow Field
              </label>
            </div>
            
            {/* Flow Fields Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="flow-fields-toggle"
                checked={enableFlowFields}
                onChange={(e) => setEnableFlowFields(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="flow-fields-toggle" className="ml-2 text-sm font-medium text-gray-300">
                Enable Flow Fields
              </label>
            </div>
            
            {/* Contour Mapping Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="contour-mapping-toggle"
                checked={enableContourMapping}
                onChange={(e) => setEnableContourMapping(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="contour-mapping-toggle" className="ml-2 text-sm font-medium text-gray-300">
                Enable Contour Mapping
              </label>
            </div>
          </div>
          
          {/* Farcaster Integration */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-cyan-300 mb-2">Farcaster Mood</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={farcasterUserId}
                onChange={(e) => setFarcasterUserId(e.target.value)}
                placeholder="Farcaster User ID"
                className="flex-1 rounded-md border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
              <button
                onClick={handleFetchMood}
                disabled={!farcasterUserId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                Fetch Mood
              </button>
            </div>
            {farcasterMood && (
              <p className="mt-2 text-sm text-gray-400">
                Current Mood: <span className="text-cyan-400">{farcasterMood}</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Wallet Connection Card */}
        <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">WALLET CONNECTION</h2>
          
          {!isConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Connect your wallet to mint or update NFTs</p>
              <div className="grid grid-cols-2 gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                  >
                    {connector.name}
                  </button>
                ))}
              </div>
              {connectError && (
                <p className="text-sm text-red-400">{connectError.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-700 p-3 rounded-md">
                <p className="text-sm text-gray-400">Connected as:</p>
                <p className="text-cyan-400 font-mono text-sm break-all">{address}</p>
              </div>
              
              <button
                onClick={() => disconnect()}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Disconnect Wallet
              </button>
              
              {/* Mint Section */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-cyan-300 mb-3">Mint New NFT</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="mint-address" className="block text-sm font-medium text-gray-400 mb-1">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      id="mint-address"
                      value={destinationAddress || address || ''}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-md border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="mint-count" className="block text-sm font-medium text-gray-400 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="mint-count"
                      min={1}
                      max={10}
                      value={mintCount}
                      onChange={(e) => setMintCount(parseInt(e.target.value) || 1)}
                      className="w-20 rounded-md border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      // Implement minting logic here
                      console.log('Minting', mintCount, 'NFT(s) to', destinationAddress || address);
                    }}
                    disabled={isMinting || isConfirming}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    {isMinting ? 'Minting...' : isConfirming ? 'Confirming...' : `Mint ${mintCount} NFT${mintCount > 1 ? 's' : ''}`}
                  </button>
                  
                  {isConfirmed && (
                    <div className="mt-2 p-2 bg-green-900/30 border border-green-800 rounded-md">
                      <p className="text-sm text-green-400">Mint successful!</p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline mt-1 inline-block"
                      >
                        View on Etherscan
                      </a>
                    </div>
                  )}
                  
                  {confirmError && (
                    <p className="text-sm text-red-400 mt-2">Error: {confirmError.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Update NFT Section */}
        {isConnected && (
          <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-600 p-4">
            <h2 className="text-xl font-bold mb-4 text-cyan-300">UPDATE EXISTING NFT</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="token-id" className="block text-sm font-medium text-gray-400 mb-1">
                  Token ID to Update
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="token-id"
                    value={tokenIdToUpdate}
                    onChange={(e) => setTokenIdToUpdate(e.target.value)}
                    placeholder="Enter token ID"
                    className="flex-1 rounded-md border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                  <button
                    onClick={() => {
                      // Implement fetch metadata logic here
                      console.log('Fetching metadata for token', tokenIdToUpdate);
                    }}
                    disabled={!tokenIdToUpdate || isFetchingNFTMetadata}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    {isFetchingNFTMetadata ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
                
                {fetchNFTMetadataError && (
                  <p className="text-sm text-red-400 mt-1">{fetchNFTMetadataError.message}</p>
                )}
              </div>
              
              {currentNFTMetadata && (
                <div className="space-y-4">
                  <div className="bg-slate-700 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-cyan-300 mb-2">Current Metadata</h4>
                    <pre className="text-xs text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(currentNFTMetadata, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // Implement generate new render logic
                        console.log('Generating new render for token', tokenIdToUpdate);
                      }}
                      disabled={isGeneratingRender}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
                    >
                      {isGeneratingRender ? 'Generating...' : 'Generate New Render'}
                    </button>
                    
                    <button
                      onClick={() => {
                        // Implement upload to IPFS logic
                        console.log('Uploading to IPFS for token', tokenIdToUpdate);
                      }}
                      disabled={!generatedImageUrl || isUploadingToIPFS}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {isUploadingToIPFS ? 'Uploading...' : 'Upload to IPFS'}
                    </button>
                    
                    <button
                      onClick={() => {
                        // Implement update on-chain logic
                        console.log('Updating on-chain for token', tokenIdToUpdate);
                      }}
                      disabled={!ipfsUrl || isUpdatingOnChain}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {isUpdatingOnChain ? 'Updating...' : 'Update On-chain'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-slate-800 p-4 border-t border-slate-700 mt-auto">
        <div className="container mx-auto text-center text-sm text-gray-400">
          <p>Gen3 NFT Studio - Create and manage your dynamic NFTs</p>
          <p className="mt-1 text-xs">Connected to Base Sepolia Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Gen3App;
