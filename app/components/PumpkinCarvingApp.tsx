'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState, useRef } from 'react';
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

function PumpkinCarvingAppContent() {
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
  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'gen2' | 'profile'>('home');
  const isAdmin = userData?.fid === 474867;
  const profileFetchAttempted = useRef(false);
  const [topMinters, setTopMinters] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null }[]>([]);
  const [topHolders, setTopHolders] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null }[]>([]);
  const [topGifters, setTopGifters] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null; recipients: string[]; uniqueRecipients: number; gifts: Array<{ recipient: string; tokenId: number; recipientUsername?: string | null }> }[]>([]);
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'minters' | 'holders' | 'gifters'>('minters');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userNFTs, setUserNFTs] = useState<Record<string, { tokenId: number; imageUrl: string }[]>>({});
  const [loadingNFTs, setLoadingNFTs] = useState<Record<string, boolean>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Default ON
  const [testNotificationText, setTestNotificationText] = useState('');

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

        // Call ready() first to initialize the SDK
        await sdk.actions.ready();
        console.log('✅ Farcaster SDK ready() called successfully');

        // Get the context to check if we're in Farcaster
        const context = sdk.context;
        console.log('📱 Farcaster context:', context);

        // Try to trigger the add mini app modal if not added
        try {
          await sdk.actions.addMiniApp();
          console.log('✅ Add mini app modal triggered');
        } catch (addError: any) {
          // User might have already added the app - this is normal
          console.log('ℹ️ Add mini app status:', addError.message);
        }
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

  // Handle "Add App" button click
  const handleAddApp = async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (error: any) {
      console.error('Failed to add mini app:', error);
      alert('Failed to add app: ' + error.message);
    }
  };

  // Handle test notification
  const handleTestNotification = async () => {
    if (!testNotificationText.trim()) {
      alert('Please enter notification text');
      return;
    }

    try {
      const response = await fetch('/api/notifications/farcaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: userData?.fid,
          title: '🧪 Test Notification',
          body: testNotificationText.substring(0, 128),
          url: 'https://bushleague.xyz'
        })
      });

      if (response.ok) {
        alert('✅ Test notification sent!');
        setTestNotificationText('');
      } else {
        const error = await response.json();
        alert('❌ Failed: ' + error.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Handle mint success + broadcast notification
  useEffect(() => {
    if (isConfirmed && hash && userData) {
      setMintSuccess(true);
      setMinting(false);
      setLoadingMessage('');

      // Broadcast "new mint" notification to everyone
      fetch('/api/notifications/mint-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minterFid: userData.fid,
          minterUsername: userData.username,
          transactionHash: hash
        })
      }).catch(err => console.error('Broadcast notification failed:', err));
    }
  }, [isConfirmed, hash, userData]);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      setError(`Mint failed: ${contractError.message || 'Unknown error'}`);
      setMinting(false);
      setLoadingMessage('');
    }
  }, [contractError]);

  // Fetch NFTs when user is expanded
  useEffect(() => {
    const fetchUserNFTs = async (address: string) => {
      // Don't fetch if already loaded
      if (userNFTs[address] || loadingNFTs[address]) return;

      setLoadingNFTs((prev) => ({ ...prev, [address]: true }));

      try {
        const response = await fetch(`/api/user-nfts?address=${address}`);
        if (response.ok) {
          const nfts = await response.json();
          setUserNFTs((prev) => ({ ...prev, [address]: nfts }));
        }
      } catch (error) {
        console.error('Error fetching user NFTs:', error);
      } finally {
        setLoadingNFTs((prev) => ({ ...prev, [address]: false }));
      }
    };

    expandedUsers.forEach(address => {
      if (!userNFTs[address] && !loadingNFTs[address]) {
        fetchUserNFTs(address);
      }
    });
  }, [expandedUsers, userNFTs, loadingNFTs]);

  // Fetch top minters when leaderboard tab is active
  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'leaderboard') {
        try {
          // Fetch minters
          const mintersResponse = await fetch('/api/top-minters');
          if (mintersResponse.ok) {
            const mintersData = await mintersResponse.json();
            setTopMinters(mintersData);
          }

          // Fetch holders
          const holdersResponse = await fetch('/api/top-holders');
          if (holdersResponse.ok) {
            const holdersData = await holdersResponse.json();
            setTopHolders(holdersData);
          }

          // Fetch gifters
          const giftersResponse = await fetch('/api/top-gifters');
          if (giftersResponse.ok) {
            const giftersData = await giftersResponse.json();
            setTopGifters(giftersData);
          }
        } catch (err) {
          console.error('Failed to fetch leaderboard data:', err);
        }
      }
    };
    fetchData();
  }, [activeTab]);

  // Reset profile fetch flag when address changes
  useEffect(() => {
    profileFetchAttempted.current = false;
    setUserData(null);
  }, [address]);

  // Auto-fetch profile when wallet connects (only once per address)
  useEffect(() => {
    const fetchProfile = async () => {
      if (isConnected && address && !userData && !profileFetchAttempted.current) {
        profileFetchAttempted.current = true;
        setLoading(true);
        setLoadingMessage('👻 Loading your profile...');
        try {
          console.log('📞 Fetching profile for address:', address);
          const response = await fetch('/api/neynar/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          console.log('📥 Response status:', response.status, response.statusText);
          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Profile fetch failed:', errorData);
            throw new Error(errorData.error || 'Profile fetch failed');
          }
          const data = await response.json();
          console.log('✅ Profile data received:', data);
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
  }, [isConnected, address, userData]);

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

      const { ipfsUrl, cid } = await uploadResponse.json();
      console.log('✅ Image uploaded to IPFS:', { ipfsUrl, cid });

      // Convert IPFS URL to a gateway URL that can be embedded
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log('✅ Gateway URL:', gatewayUrl);

      setLoadingMessage('📤 Sharing to Farcaster...');

      // Share both the user's image AND the mini app
      // First embed: user's pumpkin image
      // Second embed: mini app URL (will show as mini app card)
      const miniappUrl = 'https://bushleague.xyz';
      const result = await sdk.actions.composeCast({
        text: `🎃 Just minted my personalized Pumpkin NFT on Base!\n\n🔮 HAPPY HALLOWEEN! 👻\n\nCreated by @ionoi`,
        embeds: [gatewayUrl, miniappUrl] as [string, string],
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

  const handleTestComposeCast = async () => {
    if (!isAdmin) return;

    try {
      setLoadingMessage('📤 Testing composeCast...');

      const result = await sdk.actions.composeCast({
        text: '🧪 Testing composeCast from admin panel!\n\nThis is a test message to verify the miniapp share functionality.',
        embeds: ['https://bushleague.xyz'] as [string],
      });

      if (result?.cast) {
        setError(null);
        setLoadingMessage('🎉 Test cast posted to Farcaster!');
        setTimeout(() => {
          setLoadingMessage('');
          setError(null);
        }, 3000);
      } else {
        setLoadingMessage('');
      }
    } catch (err: any) {
      console.error('❌ Test composeCast error:', err);
      setError('Failed to test composeCast: ' + (err.message || String(err)));
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
    <div
      className="min-h-screen pb-20 relative"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b47 50%, #0f0c29 100%)',
        backgroundImage: `
          radial-gradient(ellipse at top, rgba(139, 69, 19, 0.3) 0%, transparent 50%),
          url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='graveyard' x='0' y='0' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Crect fill='%23000000' opacity='0.2' width='100' height='100'/%3E%3Cpath d='M 20 100 L 25 70 L 22 70 L 27 50 L 25 50 L 23 30 L 25 30 L 20 10 L 15 30 L 17 30 L 15 50 L 13 50 L 18 70 L 15 70 Z' fill='%23ffffff' opacity='0.15'/%3E%3Cpath d='M 80 100 L 85 70 L 82 70 L 87 50 L 85 50 L 83 30 L 85 30 L 80 10 L 75 30 L 77 30 L 75 50 L 73 50 L 78 70 L 75 70 Z' fill='%23ffffff' opacity='0.15'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23graveyard)' width='100' height='100'/%3E%3C/svg%3E")
        `,
      }}
    >
      {/* Lightning Effect Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '20%',
          width: '4px',
          height: '200px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
          filter: 'blur(2px)',
          animation: 'lightning 3s infinite',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
        }} />
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '25%',
          width: '3px',
          height: '150px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
          filter: 'blur(1px)',
          animation: 'lightning 4s infinite 1.5s',
          boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
        }} />
      </div>
      <style>{`
        @keyframes lightning {
          0%, 100% { opacity: 0; }
          1%, 2% { opacity: 1; }
          3% { opacity: 0; }
        }
      `}</style>
      <div className="max-w-2xl mx-auto p-4 pb-20" style={{ width: '100%', maxWidth: '100%', minHeight: '100vh', background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.05), rgba(0, 0, 0, 0.8))' }}>
        {activeTab === 'home' && (
          <>
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg" style={{ textAlign: 'center', marginBottom: '12px' }}>
              Carve a Pumpkin
            </h1>
            <p className="text-white/90 text-sm md:text-base" style={{ textAlign: 'center', marginBottom: '24px' }}>
              Your personality, carved into a spooky NFT
            </p>
          </>
        )}

        {loading && loadingMessage && (
          <div style={{
            backgroundColor: 'rgba(234, 88, 12, 0.2)',
            border: '2px solid rgba(234, 88, 12, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '24px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>{loadingMessage}</p>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>❌ {error}</p>
          </div>
        )}

        {mounted && !isConnected && (
          <div style={{
            backgroundColor: 'rgba(234, 179, 8, 0.2)',
            border: '2px solid rgba(234, 179, 8, 0.5)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>🔗 Connect Your Wallet</p>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>Waiting for wallet connection...</p>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-4">
            {mounted && isConnected && userData && !pumpkinDesign && !loading && (
              <>
                {/* Behind the Scenes Card with decorative images */}
                <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-4 md:p-6 border border-white/10 relative" style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Background decorative images - Side by side */}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
                    <img
                      src="/digitalpumpkin.png"
                      alt="Example Pumpkin"
                      className="hidden md:block"
                      style={{ width: '120px', height: 'auto', opacity: 0.3 }}
                    />
                    <img
                      src="/gameoverpumpkin.png"
                      alt="Game Over Pumpkin"
                      className="hidden md:block"
                      style={{ width: '120px', height: 'auto', opacity: 0.3 }}
                    />
                  </div>

                  {/* Main content card */}
                  <div style={{
                    position: 'relative',
                    zIndex: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    maxWidth: '95%',
                    margin: '0 auto',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                  }}>
                    <h3 style={{ color: '#ea580c', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                      🎃 Behind the Scenes
                    </h3>
                    <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px', fontWeight: '400' }}>
                      We use AI to analyze your Farcaster posts, extracting your personality and interests to create a unique pumpkin design perfectly tailored to you.
                    </p>
                    <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px', fontWeight: '400' }}>
                      The AI then generates a custom pumpkin image, uploads it to IPFS for permanent storage, and mints your one-of-a-kind NFT on Base blockchain.
                    </p>
                    <p style={{ color: 'rgba(168, 85, 247, 1)', fontSize: '12px', fontStyle: 'italic', margin: 0, fontWeight: '400' }}>
                      Your digital personality, carved into a spooky NFT.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <button
                    onClick={handleGeneratePumpkin}
                    disabled={loading}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '16px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      border: loading ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid #991b1b',
                      background: loading ? 'rgba(234, 88, 12, 0.3)' : 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #581c87 100%)',
                      color: 'white',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: loading ? 0.5 : 1,
                      boxShadow: loading ? 'none' : '0 8px 32px rgba(234, 88, 12, 0.4)',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🎃</span>
                    <span>Generate My Pumpkin</span>
                  </button>
                </div>
              </>
            )}

            {pumpkinDesign && pumpkinDesign.imageUrl && (mintSuccess ? (
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '32px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}>
                <div className="text-6xl text-center mb-4">🎃</div>
                <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: '#ffffff', marginBottom: '12px' }}>Minted Successfully!</h2>
                <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', marginBottom: '24px' }}>Your pumpkin is now on Base</p>
                {hash && (
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    wordBreak: 'break-all',
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {hash}
                  </div>
                )}
                {ipfsUrl && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <button
                      onClick={handleShareToFarcaster}
                      style={{
                        padding: '16px 48px',
                        borderRadius: '16px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        border: '2px solid #581c87',
                        background: 'linear-gradient(135deg, #6b21a8 0%, #581c87 50%, #991b1b 100%)',
                        color: 'white',
                        fontSize: '18px',
                        boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4)',
                      }}
                    >
                      🚀 Share on Farcaster
                    </button>
                  </div>
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
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <button
                    onClick={handleMintNFT}
                    disabled={minting || isPending || isConfirming}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '16px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      cursor: (minting || isPending || isConfirming) ? 'not-allowed' : 'pointer',
                      border: (minting || isPending || isConfirming) ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid #991b1b',
                      background: (minting || isPending || isConfirming) ? 'rgba(234, 88, 12, 0.3)' : 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #581c87 100%)',
                      color: 'white',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: (minting || isPending || isConfirming) ? 0.5 : 1,
                      boxShadow: (minting || isPending || isConfirming) ? 'none' : '0 8px 32px rgba(234, 88, 12, 0.4)',
                    }}
                  >
                    {minting || isPending || isConfirming ? (
                      loadingMessage || '⏳ Processing...'
                    ) : (
                      <>
                        <span style={{ fontSize: '24px' }}>🎃</span>
                        <span>Mint NFT (0.0003 ETH)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="text-5xl mb-4 text-center">🏆</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px', textAlign: 'center' }}>Leaderboard</h2>

            {/* Sub-tabs - Modern segmented control */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '4px',
              gap: '4px'
            }}>
              <button
                onClick={() => setLeaderboardSubTab('minters')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: leaderboardSubTab === 'minters' ? 'white' : 'transparent',
                  color: leaderboardSubTab === 'minters' ? 'black' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Top Minters
              </button>
              <button
                onClick={() => setLeaderboardSubTab('holders')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: leaderboardSubTab === 'holders' ? 'white' : 'transparent',
                  color: leaderboardSubTab === 'holders' ? 'black' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Top Holders
              </button>
              <button
                onClick={() => setLeaderboardSubTab('gifters')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: leaderboardSubTab === 'gifters' ? 'white' : 'transparent',
                  color: leaderboardSubTab === 'gifters' ? 'black' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                🎁 Top Gifters
              </button>
            </div>

            {leaderboardSubTab === 'minters' && (
              <>
                {topMinters.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <p>No mints yet! Be the first to carve a pumpkin!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topMinters.map((minter, index) => (
                      <div key={minter.address} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                          setExpandedUsers(prev => {
                            const next = new Set(prev);
                            if (next.has(minter.address)) {
                              next.delete(minter.address);
                            } else {
                              next.add(minter.address);
                            }
                            return next;
                          });
                        }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', width: '32px' }}>{index + 1}</div>
                          {minter.pfp && <img src={minter.pfp} alt={minter.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                          <div
                            style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (minter.fid) {
                                window.open(`https://warpcast.com/${minter.username || minter.fid}`, '_blank');
                              }
                            }}
                          >
                            @{minter.username || 'Unknown'}
                          </div>
                          <div style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(249, 115, 22, 0.3)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{minter.count}</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>mint{minter.count > 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(minter.address) ? '▼' : '▶'}</div>
                        </div>
                        {expandedUsers.has(minter.address) && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            {loadingNFTs[minter.address] ? (
                              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Loading gallery...</p>
                            ) : userNFTs[minter.address] && userNFTs[minter.address].length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                                {userNFTs[minter.address].map((nft) => (
                                  <img
                                    key={nft.tokenId}
                                    src={nft.imageUrl}
                                    alt={`NFT #${nft.tokenId}`}
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(nft.imageUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No NFTs found</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {leaderboardSubTab === 'gifters' && (
              <>
                {topGifters.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <p>No gifts sent yet! Be generous!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topGifters.map((gifter, index) => (
                      <div key={gifter.address} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                          setExpandedUsers(prev => {
                            const next = new Set(prev);
                            if (next.has(gifter.address)) {
                              next.delete(gifter.address);
                            } else {
                              next.add(gifter.address);
                            }
                            return next;
                          });
                        }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e', width: '32px' }}>{index + 1}</div>
                          {gifter.pfp && <img src={gifter.pfp} alt={gifter.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                          <div
                            style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (gifter.fid) {
                                window.open(`https://warpcast.com/${gifter.username || gifter.fid}`, '_blank');
                              }
                            }}
                          >
                            @{gifter.username || 'Unknown'}
                          </div>
                          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(34, 197, 94, 0.3)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{gifter.count}</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>gift{gifter.count > 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(gifter.address) ? '▼' : '▶'}</div>
                        </div>
                        {expandedUsers.has(gifter.address) && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            {gifter.gifts && gifter.gifts.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                                {gifter.gifts.map((gift, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(`https://basescan.org/nft/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS}/${gift.tokenId}`, '_blank')}
                                  >
                                    <div style={{ width: '100%', aspectRatio: '1', marginBottom: '8px', position: 'relative' }}>
                                      <img
                                        src={`/api/nft-image?tokenId=${gift.tokenId}`}
                                        alt={`NFT #${gift.tokenId}`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          borderRadius: '8px'
                                        }}
                                        onError={(e) => {
                                          e.currentTarget.src = '/gameoverpumpkin.png';
                                        }}
                                      />
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                                      To:
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#22c55e',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (gift.recipient) {
                                          window.open(`https://basescan.org/address/${gift.recipient}`, '_blank');
                                        }
                                      }}
                                    >
                                      @{gift.recipientUsername || gift.recipient.slice(0, 6) + '...' + gift.recipient.slice(-4)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                      Token #{gift.tokenId}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No gifts found</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {leaderboardSubTab === 'holders' && (
              <>
                {topHolders.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <p>No holders yet!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topHolders.map((holder, index) => (
                      <div key={holder.address} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                          setExpandedUsers(prev => {
                            const next = new Set(prev);
                            if (next.has(holder.address)) {
                              next.delete(holder.address);
                            } else {
                              next.add(holder.address);
                            }
                            return next;
                          });
                        }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7', width: '32px' }}>{index + 1}</div>
                          {holder.pfp && <img src={holder.pfp} alt={holder.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                          <div
                            style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (holder.fid) {
                                window.open(`https://warpcast.com/${holder.username || holder.fid}`, '_blank');
                              }
                            }}
                          >
                            @{holder.username || 'Unknown'}
                          </div>
                          <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(168, 85, 247, 0.3)', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{holder.count}</span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>NFT{holder.count > 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(holder.address) ? '▼' : '▶'}</div>
                        </div>
                        {expandedUsers.has(holder.address) && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            {loadingNFTs[holder.address] ? (
                              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Loading gallery...</p>
                            ) : userNFTs[holder.address] && userNFTs[holder.address].length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                                {userNFTs[holder.address].map((nft) => (
                                  <img
                                    key={nft.tokenId}
                                    src={nft.imageUrl}
                                    alt={`NFT #${nft.tokenId}`}
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(nft.imageUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No NFTs found</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'gen2' && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="text-5xl mb-4 text-center">🚀</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px', textAlign: 'center' }}>Animated Generation NFTs</h2>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px', fontSize: '16px', lineHeight: '1.6' }}>
                Get ready for the next evolution: <strong style={{ color: '#22d3ee' }}>Animated GIF NFTs</strong> powered by generative art algorithms!
              </p>

              <div style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#22d3ee', marginBottom: '12px' }}>✨ Features</h3>
                <ul style={{ textAlign: 'left', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.8' }}>
                  <li>🎨 <strong>Flow Fields</strong> - Dynamic color gradients that flow and swirl</li>
                  <li>🌀 <strong>Particle Systems</strong> - Interactive animated patterns</li>
                  <li>🌊 <strong>Contour Mapping</strong> - Smooth 3D-esque visual effects</li>
                  <li>🔄 <strong>Seamless Loops</strong> - Infinite perfect-loop animations</li>
                  <li>🎯 <strong>Unique Combinations</strong> - Billions of possible variations</li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7', marginBottom: '12px' }}>🛠️ How It Works</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.6', textAlign: 'left' }}>
                  Each NFT is generated using multiple layered algorithms that create unique, mesmerizing animations.
                  You'll be able to customize:
                </p>
                <ul style={{ textAlign: 'left', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.8', marginTop: '8px' }}>
                  <li>Color palettes and gradients</li>
                  <li>Animation speed and direction</li>
                  <li>Visual complexity and density</li>
                  <li>And much more...</li>
                </ul>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '16px', fontStyle: 'italic' }}>
                  Currently live on Base Sepolia testnet!
                </p>

                <div style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(249, 115, 22, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '2px solid rgba(249, 115, 22, 0.4)',
                  maxWidth: '400px',
                  margin: '0 auto'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>🎁 Example Gen3 NFT (Token #1)</h3>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                    <img
                      src="/api/gen3-image?tokenId=1"
                      alt="Gen3 Animated NFT"
                      style={{
                        width: '100%',
                        maxWidth: '300px',
                        height: 'auto',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '12px',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = '/gameoverpumpkin.png';
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <a
                      href="https://sepolia.basescan.org/nft/0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6/1"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#22d3ee', textDecoration: 'underline' }}
                    >
                      View on Basescan →
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && userData && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="flex flex-col items-center mb-6">
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>{userData.displayName || userData.username}</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>@{userData.username}</p>
            </div>
            <div className="space-y-3">
              {/* Notifications Toggle */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>🔔 In-App Notifications</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Get notified when you mint an NFT</p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: notificationsEnabled ? 'rgba(34, 197, 94, 0.5)' : 'rgba(107, 114, 128, 0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transform: notificationsEnabled ? 'translateX(24px)' : 'translateX(2px)',
                    transition: 'transform 0.3s'
                  }} />
                </button>
              </div>

              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>FID</p>
                <p style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '16px' }}>{userData.fid}</p>
              </div>
              {userData.bio && (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Bio</p>
                  <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }}>{userData.bio}</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <div style={{
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'rgba(168, 85, 247, 1)', marginBottom: '12px' }}>🔧 Admin Tools</h3>

                {/* Test Notification */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Enter notification text..."
                    value={testNotificationText}
                    onChange={(e) => setTestNotificationText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleTestNotification}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      backgroundColor: 'rgba(59, 130, 246, 0.3)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      color: 'white',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    📨 Send Test Notification
                  </button>
                </div>

                <button
                  onClick={handleTestComposeCast}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.5)',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  🧪 Test ComposeCast
                </button>
              </div>
            )}
          </div>
        )}
        </div>

      {/* Bottom Navigation - Halloween Theme */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to right, #dc2626, #6b21a8)', height: '64px', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)' }}>
        <button onClick={() => setActiveTab('home')} style={{ fontSize: '28px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: activeTab === 'home' ? 1 : 0.6 }}>
          🎃
        </button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ fontSize: '28px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: activeTab === 'leaderboard' ? 1 : 0.6 }}>
          🏆
        </button>
        <button onClick={() => setActiveTab('gen2')} style={{ fontSize: '28px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: activeTab === 'gen2' ? 1 : 0.6 }}>
          🚀
        </button>
        {userData && userData.pfp && (
          <button onClick={() => setActiveTab('profile')} style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: activeTab === 'profile' ? '2px solid white' : '2px solid transparent', padding: 0, cursor: 'pointer' }}>
            <img src={userData.pfp} alt={userData.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        )}
      </div>
    </div>
  );
}

export function PumpkinCarvingApp() {
  return <PumpkinCarvingAppContent />;
}
