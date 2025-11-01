'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState, useRef } from 'react';
import { parseEther } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { gen1ABI } from '../gen1-creator/abi';

interface UserData {
  posts: any[];
  pfp: string;
  username: string;
  bio: string;
  fid: number;
  displayName: string;
}

const GEN1_CONTRACT_ADDRESS = '0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6';

function Gen1AppContent() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'gen1' | 'leaderboard' | 'profile'>('gen1');
  const [userBalance, setUserBalance] = useState<bigint | null>(null);
  const [userTokenId, setUserTokenId] = useState<number | null>(null);
  const isAdmin = userData?.fid === 474867;
  const [topMinters, setTopMinters] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null }[]>([]);
  const [topHolders, setTopHolders] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null }[]>([]);
  const [topGifters, setTopGifters] = useState<{ address: string; count: number; username: string | null; fid: number | null; pfp: string | null; recipients: string[]; uniqueRecipients: number; gifts: Array<{ recipient: string; tokenId: number; recipientUsername?: string | null }> }[]>([]);
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'minters' | 'holders' | 'gifters'>('minters');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userNFTs, setUserNFTs] = useState<Record<string, { tokenId: number; imageUrl: string }[]>>({});
  const [loadingNFTs, setLoadingNFTs] = useState<Record<string, boolean>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [testNotificationText, setTestNotificationText] = useState('');
  const [leaderboardNotice, setLeaderboardNotice] = useState<string | null>(null);

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




  // Check user's NFT balance
  useEffect(() => {
    const checkBalance = async () => {
      if (!address || !publicClient) return;

      try {
        const balance = await publicClient.readContract({
          address: GEN1_CONTRACT_ADDRESS as `0x${string}`,
          abi: gen1ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        const balanceValue = BigInt(balance as unknown as bigint);
        setUserBalance(balanceValue);

        // If user has NFTs, find the first tokenId they own
        if (balanceValue > BigInt(0)) {
          // For now, we'll find the tokenId by checking sequentially (inefficient but simple)
          // In production, you might want to cache this or use an indexer
          for (let i = 1; i <= 1111; i++) {
            try {
              const owner = await publicClient.readContract({
                address: GEN1_CONTRACT_ADDRESS as `0x${string}`,
                abi: gen1ABI,
                functionName: 'ownerOf',
                args: [BigInt(i)],
              });

              const ownerAddress = owner as string;
              if (ownerAddress.toLowerCase() === address.toLowerCase()) {
                setUserTokenId(i);
                break;
              }
            } catch {
              // Token doesn't exist yet, continue
              continue;
            }
          }
        }
      } catch (err) {
        console.error('Error checking balance:', err);
      }
    };

    checkBalance();
    const interval = setInterval(checkBalance, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [address, publicClient]);

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
          // Reset notice before fetch
          setLeaderboardNotice(null);

          // Fetch minters
          const mintersResponse = await fetch('/api/top-minters');
          if (mintersResponse.ok) {
            const mintersData = await mintersResponse.json();
            setTopMinters(mintersData);
          } else {
            const txt = await mintersResponse.text();
            console.error('Failed to fetch minters:', mintersResponse.status, txt);
            if (mintersResponse.status === 400 && txt.includes('Contract not deployed')) {
              setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
            }
          }

          // Fetch holders
          const holdersResponse = await fetch('/api/top-holders');
          if (holdersResponse.ok) {
            const holdersData = await holdersResponse.json();
            setTopHolders(holdersData);
          } else {
            const txt = await holdersResponse.text();
            console.error('Failed to fetch holders:', holdersResponse.status, txt);
            if (holdersResponse.status === 400 && txt.includes('Contract not deployed')) {
              setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
            }
          }

          // Fetch gifters
          const giftersResponse = await fetch('/api/top-gifters');
          if (giftersResponse.ok) {
            const giftersData = await giftersResponse.json();
            setTopGifters(giftersData);
          } else {
            const txt = await giftersResponse.text();
            console.error('Failed to fetch gifters:', giftersResponse.status, txt);
            if (giftersResponse.status === 400 && txt.includes('Contract not deployed')) {
              setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
            }
          }
        } catch (err) {
          console.error('Failed to fetch leaderboard data:', err);
        }
      }
    };
    fetchData();
  }, [activeTab]);

  // Auto-fetch profile when wallet connects (only once per address)
  useEffect(() => {
    const fetchProfile = async () => {
      if (isConnected && address && !userData && !loading) {
        setLoading(true);
        setLoadingMessage('Loading your profile...');
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
      className="min-h-screen pb-32 relative"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto p-4 pb-32" style={{ width: '100%', maxWidth: '100%', minHeight: '100vh', paddingBottom: '120px', background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05), rgba(0, 0, 0, 0.8))' }}>

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
            {leaderboardNotice && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.85)'
              }}>
                {leaderboardNotice}
              </div>
            )}
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

        {activeTab === 'gen1' && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="text-5xl mb-4 text-center">🚀</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px', textAlign: 'center' }}>Animated Generation NFTs</h2>

            {/* Demo NFT at the top */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-block',
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                borderRadius: '16px',
                padding: '20px',
                border: '2px solid rgba(249, 115, 22, 0.4)',
                maxWidth: '350px',
                margin: '0 auto'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>🎁 Example Gen1 NFT (Token #1)</h3>
                <div style={{ position: 'relative', width: '100%', margin: '0 auto' }}>
                  <img
                    src="/api/gen1-image?tokenId=1"
                    alt="Gen1 Animated NFT"
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      height: 'auto',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      marginBottom: '12px',
                      display: 'block',
                      margin: '0 auto 12px'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                  <a
                    href="https://sepolia.basescan.org/nft/0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6/1"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#22d3ee', textDecoration: 'underline' }}
                  >
                    View on Basescan →
                  </a>
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                  Live on Base Sepolia testnet
                </p>
              </div>
            </div>

            {/* Condensed explanation */}
            <div style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(34, 211, 238, 0.3)', marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '15px', lineHeight: '1.6', marginBottom: '12px', textAlign: 'left' }}>
                <strong style={{ color: '#22d3ee' }}>Animated GIF NFTs</strong> powered by generative art algorithms. Each unique design combines:
              </p>
              <ul style={{ textAlign: 'left', color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                <li>🎨 <strong>Flow Fields</strong> - Dynamic flowing gradients</li>
                <li>🌀 <strong>Particle Systems</strong> - Interactive animated patterns</li>
                <li>🌊 <strong>Contour Mapping</strong> - Smooth 3D visual effects</li>
                <li>🔄 <strong>Seamless Loops</strong> - Infinite perfect animations</li>
              </ul>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', lineHeight: '1.6', marginTop: '12px', marginBottom: 0, textAlign: 'left' }}>
                Customize colors, speeds, and complexity for billions of unique combinations.
              </p>
            </div>

            {/* Action Buttons */}
            {isConnected && address && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                {userBalance && userBalance > BigInt(0) ? (
                  <>
                    <button
                      onClick={handleUpdateNFT}
                      style={{
                        padding: '16px 32px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '16px',
                        backgroundColor: 'rgba(34, 211, 238, 0.2)',
                        border: '2px solid rgba(34, 211, 238, 0.5)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.2)';
                      }}
                    >
                      🔄 Update Your NFT (Token #{userTokenId || '?'})
                    </button>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', margin: 0 }}>
                      You already own {userBalance.toString()} Gen1 NFT{userBalance > BigInt(1) ? 's' : ''}. Update it for a new design.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOpenCreator}
                      style={{
                        padding: '16px 32px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '16px',
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        border: '2px solid rgba(59, 130, 246, 0.6)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      🚀 Create & Mint Your Gen1 NFT
                    </button>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', margin: 0 }}>
                      One mint per wallet. Create your unique animated NFT powered by AI personality analysis.
                    </p>
                  </>
                )}
              </div>
            )}

            {!isConnected && (
              <div style={{
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                border: '2px solid rgba(234, 179, 8, 0.5)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                marginTop: '24px'
              }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>🔗 Connect Your Wallet</p>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>Connect your wallet to create and mint your Gen1 NFT</p>
              </div>
            )}
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

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to right, #1e293b, #334155)', height: '64px', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <button onClick={() => setActiveTab('gen1')} style={{ fontSize: '28px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: activeTab === 'gen1' ? 1 : 0.6 }}>
          🚀
        </button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ fontSize: '28px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: activeTab === 'leaderboard' ? 1 : 0.6 }}>
          🏆
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

export function Gen1MainApp() {
  return <Gen1AppContent />;
}
