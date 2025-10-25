'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

interface UserData {
  posts: any[];
  pfp: string;
  username: string;
  bio: string;
  fid: number;
  displayName: string;
}

interface PumpkinDesign {
  theme: string;
  description: string;
  imageUrl: string;
  thoughtProcess: string;
  personalityAnalysis: any;
}

const HALLOWEEN_MESSAGES = [
  '🎃 Carving out your personality...',
  '👻 Analyzing your spooky side...',
  '🧙 Stirring the cauldron of creativity...',
  '🦇 Bats are plotting your design...',
  '💀 Skeleton crew hard at work...',
  '🕷️ Weaving your web of inspiration...',
  '🔮 Crystal ball gazing into your soul...',
  '🎭 Masks are off, creativity is on...',
  '🌙 Full moon magic in progress...',
  '⚰️ Digging deep for unique design...',
];

const PUMPKIN_NFT_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'imageUrl', type: 'string' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export function PumpkinCarvingApp() {
  const { address, isConnected } = useAccount();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pumpkinDesign, setPumpkinDesign] = useState<PumpkinDesign | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  // const [showDebugInfo, setShowDebugInfo] = useState(false); // Commented out - debug info removed
  const [generatingImage, setGeneratingImage] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState<string>('');

  const { writeContract, data: hash, isPending, error: contractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Mount state to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Farcaster SDK and call ready
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log('✅ Farcaster SDK ready');
      } catch (error) {
        console.error('SDK init error:', error);
      }
    };
    initializeSDK();
  }, []);

  // Get random Halloween message
  const getRandomMessage = () => {
    return HALLOWEEN_MESSAGES[Math.floor(Math.random() * HALLOWEEN_MESSAGES.length)];
  };



  // Handle mint success
  useEffect(() => {
    if (isConfirmed && hash) {
      setMintSuccess(true);
      setMinting(false);
      setLoadingMessage('');
      // Keep the design visible so user can see what they minted
    }
  }, [isConfirmed, hash]);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      setError(`Mint failed: ${contractError.message || 'Unknown error'}`);
      setMinting(false);
      setLoadingMessage('');
    }
  }, [contractError]);

  // Auto-fetch user data and generate design when wallet is connected
  useEffect(() => {
    if (isConnected && address && !userData && !pumpkinDesign && !loading) {
      console.log('✅ Wallet connected:', address);
      fetchUserDataOnly();
    }
  }, [isConnected, address]);

  // Auto-generate design after user data is loaded
  useEffect(() => {
    if (userData && !pumpkinDesign && !loading && !generatingImage) {
      console.log('✅ User data loaded, auto-generating design...');
      generateDesign();
    }
  }, [userData]);

  // Auto-generate image after design is created
  useEffect(() => {
    if (pumpkinDesign && !pumpkinDesign.imageUrl && !generatingImage && !loading) {
      console.log('✅ Design loaded, auto-generating image...');
      generateImage();
    }
  }, [pumpkinDesign]);

  const fetchUserDataOnly = async () => {
    if (!address) {
      console.log('❌ No address available for fetchUserDataOnly');
      return;
    }

    console.log('🔍 Fetching Farcaster profile for address:', address);
    setLoading(true);
    setError(null);
    setLoadingMessage('👻 Fetching your Farcaster profile...');

    try {
      const response = await fetch('/api/neynar/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user data');
      }

      const data = await response.json();
      console.log('✅ User data fetched:', data.username);
      setUserData(data);
    } catch (err: any) {
      console.error('❌ Error fetching user data:', err);
      setError(err.message || 'Failed to load Farcaster profile');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const generateDesign = async () => {
    if (!userData) return;

    setLoading(true);
    setError(null);
    setLoadingMessage('🎃 Analyzing your personality and carving your pumpkin...');

    try {
      const response = await fetch('/api/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: userData.posts,
          pfp: userData.pfp,
          username: userData.username,
          bio: userData.bio,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate design');
      }

      const design = await response.json();
      setPumpkinDesign(design);
    } catch (err: any) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const generateImage = async () => {
    if (!pumpkinDesign) return;

    setGeneratingImage(true);
    setLoadingMessage('🎨 Painting your pumpkin with AI magic...');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: pumpkinDesign.theme,
          description: pumpkinDesign.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const { imageUrl } = await response.json();
      setPumpkinDesign({ ...pumpkinDesign, imageUrl });
    } catch (err: any) {
      setError('Failed to generate pumpkin image');
    } finally {
      setGeneratingImage(false);
      setLoadingMessage('');
    }
  };

  const handleShareToFarcaster = async () => {
    if (!mintSuccess || !hash || !ipfsUrl) {
      setError('No successful mint to share yet!');
      return;
    }

    try {
      const result = await sdk.actions.composeCast({
        text: `🎃 Just minted my personalized Pumpkin NFT on Base!`,
        embeds: [pumpkinDesign.imageUrl || ipfsUrl],
      });

      if (result?.cast) {
        setError(null);
        setLoadingMessage('🎉 Cast posted to Farcaster!');
        setTimeout(() => setLoadingMessage(''), 3000);
      }
    } catch (err: any) {
      setError('Failed to share: ' + (err.message || String(err)));
    }
  };

  const handleMintNFT = async () => {
    if (!pumpkinDesign?.imageUrl || !address) return;

    setMinting(true);
    setError(null);
    setMintSuccess(false);

    try {
      // Step 1: Upload image to IPFS
      setLoadingMessage('🌐 Uploading pumpkin to IPFS...');

      const uploadResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: pumpkinDesign.imageUrl }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const { ipfsUrl } = await uploadResponse.json();
      setIpfsUrl(ipfsUrl);
      console.log('✅ IPFS URL:', ipfsUrl);

      setLoadingMessage('🎃 Sending transaction...');

      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;
      if (!nftContractAddress || nftContractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('NFT contract not deployed yet');
      }

      console.log('📝 Calling writeContract...');
      console.log('  - Address:', nftContractAddress);
      console.log('  - IPFS URL:', ipfsUrl);
      console.log('  - Value:', parseEther('0.0003').toString());

      writeContract({
        address: nftContractAddress,
        abi: PUMPKIN_NFT_ABI,
        functionName: 'mint',
        args: [ipfsUrl],
        value: parseEther('0.0003'),
      });

      setLoadingMessage('Transaction sent. Check your wallet to sign...');
      console.log('✅ writeContract called');

      // Note: Don't reset state here - let the useEffect handle success
      // The minting state will be updated by the useEffect hooks
    } catch (error: any) {
      console.error('❌ Mint error:', error);
      console.error('❌ Error details:', { message: error.message, code: error.code, stack: error.stack });

      if (error.code === 4001) {
        setError('Transaction rejected by user');
      } else {
        setError('Mint failed: ' + (error.message || String(error)));
      }
      setMinting(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 p-4 overflow-hidden">
      <div className="max-w-2xl mx-auto h-screen overflow-y-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-2 text-white drop-shadow-lg">
            🎃 Carve a Pumpkin
          </h1>
          <p className="text-center text-white/90 text-sm mb-6">
            Your personality, carved into a spooky NFT
          </p>

          {loading && loadingMessage && (
            <div className="bg-orange-500/20 border-2 border-orange-400 rounded-2xl p-6 text-center mb-6 animate-pulse">
              <p className="text-2xl font-bold text-white">{loadingMessage}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border-2 border-red-400 rounded-2xl p-6 text-center mb-6">
              <p className="text-xl font-bold text-white">❌ {error}</p>
            </div>
          )}

          {mounted && !isConnected && (
            <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-2xl p-8 text-center">
              <p className="text-2xl font-bold text-white mb-4">🔗 Connect Your Wallet</p>
              <p className="text-white/80">Waiting for wallet connection...</p>
            </div>
          )}

          {mounted && isConnected && !userData && !loading && (
            <div className="bg-blue-500/20 border-2 border-blue-400 rounded-2xl p-8 text-center">
              <p className="text-2xl font-bold text-white mb-4">👻 Loading Farcaster Profile...</p>
              <p className="text-white/80">Connected to: {address}</p>
            </div>
          )}

          {userData && !pumpkinDesign && !loading && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border-2 border-purple-400">
                <div className="flex items-center gap-3">
                  {userData.pfp && (
                    <img
                      src={userData.pfp}
                      alt={userData.username}
                      className="w-12 h-12 rounded-full border-2 border-white/50"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-white">{userData.displayName || userData.username}</h2>
                    <p className="text-sm text-white/80">@{userData.username}</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-white/90 text-lg">Generating your pumpkin design...</p>
            </div>
          )}

          {pumpkinDesign && (
            <div className="space-y-4">
              {!pumpkinDesign.imageUrl ? (
                <div className="space-y-4">
                  <p className="text-center text-white/90 text-lg">Generating image...</p>
                </div>
              ) : mintSuccess ? (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-6 text-center">
                    <div className="text-5xl mb-4">🎃</div>
                    <h2 className="text-2xl font-bold text-white mb-2">NFT Minted Successfully!</h2>
                    <p className="text-white/80 mb-4">Your pumpkin has been carved and minted on Base</p>
                    {hash && (
                      <div className="bg-gray-900/50 rounded-lg p-3 text-xs text-white/60 break-all mb-4">
                        {hash}
                      </div>
                    )}
                    {ipfsUrl && (
                      <button
                        onClick={handleShareToFarcaster}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white text-lg font-bold py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all shadow-lg mt-4"
                      >
                        🚀 Share on Farcaster
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-black/50 rounded-2xl p-2 flex justify-center items-center w-full overflow-hidden">
                    <img
                      src={pumpkinDesign.imageUrl}
                      alt="Your Pumpkin"
                      className="max-w-full h-auto rounded-xl object-contain block"
                      style={{ maxWidth: '100%', maxHeight: '60vh' }}
                    />
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleMintNFT}
                      disabled={minting || isPending || isConfirming}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg transform hover:scale-105"
                    >
                      {minting || isPending || isConfirming
                        ? (loadingMessage || '⏳ Processing...')
                        : '🎃 Mint NFT (0.0003 ETH)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debug info commented out - TODO: remove entirely soon
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-white/60 hover:text-white text-sm"
            >
              {showDebugInfo ? '🔽' : '▶️'} Debug Info
            </button>
            {showDebugInfo && (
              <div className="mt-4 bg-black/30 rounded-lg p-4 text-left text-xs text-white/80 font-mono overflow-auto max-h-60">
                <p>Connected: {isConnected ? '✅' : '❌'}</p>
                <p>Address: {address || 'N/A'}</p>
                <p>User Data: {userData ? '✅ Loaded' : '❌ Not loaded'}</p>
                <p>Posts/Casts: {userData ? `${userData.posts?.length || 0}` : 'N/A'}</p>
                <p>Design: {pumpkinDesign ? '✅ Generated' : '❌ Not generated'}</p>
                <p>Image: {pumpkinDesign?.imageUrl ? '✅ Generated' : '❌ Not generated'}</p>
              </div>
            )}
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
