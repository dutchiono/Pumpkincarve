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
  const [generatingImage, setGeneratingImage] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState<string>('');
  const [personalityInsights, setPersonalityInsights] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'profile'>('home');
  const [topMinters, setTopMinters] = useState<{ address: string; count: number }[]>([]);

  const { writeContract, data: hash, isPending, error: contractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Mount state to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Farcaster SDK and call ready - CRITICAL for dismissing splash screen
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log('🔄 Attempting to call sdk.actions.ready()...');
        await sdk.actions.ready();
        console.log('✅ Farcaster SDK ready() called successfully');
        console.log('✅ Splash screen should be dismissed now');
      } catch (error: any) {
        console.error('❌ SDK ready() error:', error);
        // Try calling it again as a fallback
        try {
          console.log('🔄 Retrying sdk.actions.ready()...');
          await sdk.actions.ready();
          console.log('✅ SDK ready() succeeded on retry');
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
        }
      }
    };

    // Call immediately and also after a short delay
    initializeSDK();
    const timer = setTimeout(initializeSDK, 500);
    return () => clearTimeout(timer);
  }, []);



  // Get random Halloween message
  const getRandomMessage = () => {
    return HALLOWEEN_MESSAGES[Math.floor(Math.random() * HALLOWEEN_MESSAGES.length)];
  };

  // Generate personality insights from analysis
  const generatePersonalityInsights = (analysis: any, username: string) => {
    const insights: string[] = [];

    if (analysis.themes && analysis.themes.length > 0) {
      insights.push(`We noticed you love talking about ${analysis.themes[0]}! 🎃`);
    }

    if (analysis.interests && analysis.interests.length > 0) {
      insights.push(`Your passion for ${analysis.interests[0]} is carving into this design! 🔪`);
    }

    if (analysis.personality) {
      insights.push(`Your ${analysis.personality.toLowerCase()} vibes are perfect for Halloween! 👻`);
    }

    if (analysis.mood) {
      insights.push(`That ${analysis.mood.toLowerCase()} energy is so spooky cool! 🦇`);
    }

    insights.push(`@${username}, your Halloween spirit is about to shine! 🎃✨`);

    return insights;
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

  // Fetch top minters when leaderboard tab is active
  useEffect(() => {
    const fetchTopMinters = async () => {
      if (activeTab === 'leaderboard') {
        try {
          const response = await fetch('/api/top-minters');
          if (response.ok) {
            const data = await response.json();
            setTopMinters(data);
          }
        } catch (err) {
          console.error('Failed to fetch top minters:', err);
        }
      }
    };
    fetchTopMinters();
  }, [activeTab]);

  // Auto-fetch profile when wallet connects
  useEffect(() => {
    const fetchProfile = async () => {
      if (isConnected && address && !userData && !loading) {
        setLoading(true);
        setLoadingMessage('👻 Loading your profile...');
        try {
          const response = await fetch('/api/neynar/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          if (!response.ok) throw new Error('Profile fetch failed');
          const data = await response.json();
          setUserData(data);
        } catch (err: any) {
          console.error('Profile fetch error:', err);
          setError('Could not load profile - ensure you have a Farcaster account connected to this wallet');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      }
    };
    fetchProfile();
  }, [isConnected, address, userData, loading]);

  // One button to generate design + image
  const handleGeneratePumpkin = async () => {
    if (!userData) return;

    setLoading(true);
    setError(null);
    setPumpkinDesign(null);

    try {
      setLoadingMessage('🎃 Analyzing your personality...');
      const designResponse = await fetch('/api/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: userData.posts,
          pfp: userData.pfp,
          username: userData.username,
          bio: userData.bio,
        }),
      });

      if (!designResponse.ok) throw new Error('Failed to generate design');
      const design = await designResponse.json();

      if (design.personalityAnalysis) {
        const insights = generatePersonalityInsights(design.personalityAnalysis, userData.username);
        setPersonalityInsights(insights);
      }

      setLoadingMessage('🎨 Creating your pumpkin...');
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: design.theme,
          description: design.description,
        }),
      });

      if (!imageResponse.ok) throw new Error('Failed to generate image');
      const { imageUrl } = await imageResponse.json();
      console.log('✅ Generated image URL:', imageUrl);
      const fullDesign = { ...design, imageUrl };
      console.log('✅ Setting pumpkinDesign:', fullDesign);
      setPumpkinDesign(fullDesign);
      setLoadingMessage('');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const generateDesign = async () => {
    if (!userData) return;

    setLoading(true);
    setError(null);

    // Set initial loading message
    setLoadingMessage('🎃 Analyzing your posts for personality insights...');

    // Store insights for later use during image generation
    let generatedInsights: string[] = [];

    // Rotate loading messages during analysis
    const messageInterval = setInterval(() => {
      const randomMessage = HALLOWEEN_MESSAGES[Math.floor(Math.random() * HALLOWEEN_MESSAGES.length)];
      setLoadingMessage(randomMessage);
    }, 2000);

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

      // Generate personality insights from the design
      if (design.personalityAnalysis) {
        generatedInsights = generatePersonalityInsights(design.personalityAnalysis, userData.username);
        setPersonalityInsights(generatedInsights);
      }

      setPumpkinDesign(design);
      clearInterval(messageInterval);
    } catch (err: any) {
      clearInterval(messageInterval);
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

    // Rotate through Halloween messages and insights during image generation
    const messageInterval = setInterval(() => {
      if (personalityInsights.length > 0 && Math.random() > 0.5) {
        // Show personality insight
        const insight = personalityInsights[Math.floor(Math.random() * personalityInsights.length)];
        setLoadingMessage(insight);
      } else {
        // Show Halloween message
        const randomMessage = HALLOWEEN_MESSAGES[Math.floor(Math.random() * HALLOWEEN_MESSAGES.length)];
        setLoadingMessage(randomMessage);
      }
    }, 2500);

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
      clearInterval(messageInterval);
    } catch (err: any) {
      clearInterval(messageInterval);
      setError('Failed to generate pumpkin image');
    } finally {
      setGeneratingImage(false);
      setLoadingMessage('');
    }
  };

  const handleShareToFarcaster = async () => {
    if (!mintSuccess || !hash || !pumpkinDesign) {
      setError('No successful mint to share yet!');
      return;
    }

    try {
      // Upload to IPFS first to get a permanent URL for sharing
      setLoadingMessage('🌐 Uploading to IPFS...');

      const uploadResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: pumpkinDesign.imageUrl }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const { gatewayUrl } = await uploadResponse.json();
      console.log('✅ Image uploaded to IPFS for sharing:', gatewayUrl);

      // Create dynamic embed URL with the IPFS gateway URL
      const embedUrl = `https://bushleague.xyz/embed?image=${encodeURIComponent(gatewayUrl)}`;

      setLoadingMessage('📤 Sharing to Farcaster...');

      const result = await sdk.actions.composeCast({
        text: '🎃 Just minted my personalized Pumpkin NFT on Base!\n\n🔮 HAPPY HALLOWEEN! 👻\n\nMint your own: @bushleague.xyz',
        embeds: [embedUrl] as [string],
      });

      if (result?.cast) {
        setError(null);
        setLoadingMessage('🎉 Cast posted to Farcaster!');
        setTimeout(() => {
          setLoadingMessage('');
          setError(null);
        }, 3000);
      } else {
        // User cancelled
        setLoadingMessage('');
      }
    } catch (err: any) {
      console.error('❌ Share error:', err);
      setError('Failed to share: ' + (err.message || String(err)));
      setLoadingMessage('');
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
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 pb-20" style={{ width: '100vw', maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="max-w-2xl mx-auto p-4 pb-20" style={{ width: '100%', maxWidth: '100%' }}>
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3 text-white drop-shadow-lg">
          🎃 Carve a Pumpkin
        </h1>
        <p className="text-center text-white/90 text-sm md:text-base mb-6">
          Your personality, carved into a spooky NFT
        </p>

        {loading && loadingMessage && (
          <div className="bg-orange-500/20 border-2 border-orange-400 rounded-2xl p-4 md:p-6 text-center mb-6 animate-pulse">
            <p className="text-lg md:text-2xl font-bold text-white">{loadingMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border-2 border-red-400 rounded-2xl p-4 md:p-6 text-center mb-6">
            <p className="text-base md:text-xl font-bold text-white">❌ {error}</p>
          </div>
        )}

        {mounted && !isConnected && (
          <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-xl md:text-2xl font-bold text-white mb-4">🔗 Connect Your Wallet</p>
            <p className="text-sm md:text-base text-white/80">Waiting for wallet connection...</p>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-4">
            {mounted && isConnected && userData && !pumpkinDesign && !loading && (
              <>
                {/* Example pumpkins splash */}
                <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-4 border border-white/10 overflow-hidden">
                  <img
                    src="/digitalpumpkin.png"
                    alt="Example Pumpkin"
                    className="w-full h-auto rounded-2xl"
                    style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
                  />
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
                  <button
                    onClick={handleGeneratePumpkin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white text-lg font-bold py-5 rounded-2xl hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">🎃</span>
                    <span>Generate My Pumpkin</span>
                  </button>
                </div>
              </>
            )}

            {pumpkinDesign && pumpkinDesign.imageUrl && (mintSuccess ? (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-3xl p-6 border border-green-500/30">
                <div className="text-6xl text-center mb-4">🎃</div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Minted Successfully!</h2>
                <p className="text-white/80 mb-6 text-center">Your pumpkin is now on Base</p>
                {hash && (
                  <div className="bg-black/50 rounded-xl p-3 text-xs text-white/60 break-all mb-4 font-mono">
                    {hash}
                  </div>
                )}
                {ipfsUrl && (
                  <button
                    onClick={handleShareToFarcaster}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-4 rounded-2xl hover:shadow-2xl hover:shadow-purple-600/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    🚀 Share on Farcaster
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-4 border border-white/10 overflow-hidden">
                  <img
                    src={pumpkinDesign.imageUrl}
                    alt="Your Pumpkin"
                    className="rounded-2xl"
                    style={{ maxWidth: '100%', width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
                  />
                </div>
                <button
                  onClick={handleMintNFT}
                  disabled={minting || isPending || isConfirming}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold py-5 rounded-2xl hover:shadow-2xl hover:shadow-green-500/50 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {minting || isPending || isConfirming ? (
                    loadingMessage || '⏳ Processing...'
                  ) : (
                    <>
                      <span className="text-2xl">🎃</span>
                      <span>Mint NFT (0.0003 ETH)</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
            <div className="text-5xl mb-4 text-center">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Top Minters</h2>

            {topMinters.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <p>No mints yet! Be the first to carve a pumpkin!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topMinters.map((minter, index) => (
                  <div key={minter.address} className="bg-black/30 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-white/50 w-8">{index + 1}</div>
                      <div className="font-mono text-white text-sm break-all">{minter.address.slice(0, 10)}...{minter.address.slice(-8)}</div>
                    </div>
                    <div className="bg-orange-500/20 px-4 py-2 rounded-full border border-orange-500/30">
                      <span className="font-bold text-orange-400">{minter.count}</span>
                      <span className="text-white/70 text-sm ml-1">mints</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && userData && (
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{userData.displayName || userData.username}</h2>
              <p className="text-white/70">@{userData.username}</p>
            </div>
            <div className="space-y-3">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/50 mb-1">FID</p>
                <p className="text-white font-mono">{userData.fid}</p>
              </div>
              {userData.bio && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/50 mb-2">Bio</p>
                  <p className="text-white">{userData.bio}</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#dc2626', height: '64px', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px' }}>
        <button onClick={() => setActiveTab('home')} style={{ fontSize: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
          🎃
        </button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ fontSize: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
          🏆
        </button>
        {userData && userData.pfp && (
          <button onClick={() => setActiveTab('profile')} style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}>
            <img src={userData.pfp} alt={userData.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        )}
      </div>
    </div>
  );
}
