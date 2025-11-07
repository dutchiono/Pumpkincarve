'use client';

import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useRef, useState } from 'react';
import { decodeEventLog } from 'viem';
import { useAccount, useConnect, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { gen1ABI } from '../gen1-creator/abi';

const GEN1_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS || '0x9d394EAD99Acab4cF8e65cdA3c8e440fB7D27087') as `0x${string}`;

function Gen1AppContent() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const { connect, connectors } = useConnect();
  const { isInFarcaster, isLoading: isLoadingFarcaster } = useFarcasterContext();

  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Mint state
  const [isMinting, setIsMinting] = useState(false);
      const [mintProgress, setMintProgress] = useState(0);
      const [contractMintPrice, setContractMintPrice] = useState<bigint | null>(null);
      const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
      const [mintedImageUrl, setMintedImageUrl] = useState<string | null>(null); // Store image URL for cast sharing
      const MAX_SUPPLY = 1111;

  const hasInitializedWallet = useRef(false);
  const providerRef = useRef<any>(null);

  // Mount state to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track connection status changes
  useEffect(() => {
    if (isConnected && isInFarcaster) {
      setIsConnectingWallet(false);
      hasInitializedWallet.current = true;
    }
  }, [isConnected, isInFarcaster]);

  // Auto-connect Farcaster wallet when in miniapp
  useEffect(() => {
    // Skip if not in Farcaster, already initialized, still loading, or already connected
    if (!isInFarcaster || hasInitializedWallet.current || isLoadingFarcaster || isConnected) {
      return;
    }

    const connectFarcasterWallet = async () => {
      try {
        setIsConnectingWallet(true);

        // Wait for SDK and connectors to be ready
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check again if connected (might have auto-connected)
        if (isConnected) {
          hasInitializedWallet.current = true;
          setIsConnectingWallet(false);
          return;
        }

        // In Farcaster miniapp, there should be only one connector (Farcaster)
        if (connectors.length === 0) {
          console.log('[Gen1] No connectors available yet');
          hasInitializedWallet.current = false;
          setIsConnectingWallet(false);
          return;
        }

        // Get the Farcaster connector (should be the only one)
        const farcasterConnector = connectors[0];

        if (!farcasterConnector) {
          console.log('[Gen1] Farcaster connector not found');
          hasInitializedWallet.current = false;
          setIsConnectingWallet(false);
          return;
        }

        console.log('[Gen1] Attempting to connect Farcaster wallet via connector:', farcasterConnector.id || farcasterConnector.name);

        // Connect using wagmi's connect function
        // The connect function is not async but triggers the connection
        connect({ connector: farcasterConnector });

        // Wait for connection to establish (give it time)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mark as initialized (connection might still be in progress)
        hasInitializedWallet.current = true;

        // Set connecting to false after a delay if still not connected
        setTimeout(() => {
          if (!isConnected) {
            console.log('[Gen1] Wallet connection timeout - may still be connecting');
            setIsConnectingWallet(false);
          }
        }, 3000);
      } catch (err: any) {
        console.error('[Gen1] Could not connect Farcaster wallet:', err);
        hasInitializedWallet.current = false;
        setIsConnectingWallet(false);
      }
    };

    connectFarcasterWallet();
  }, [isInFarcaster, isLoadingFarcaster, connect, connectors]);

  // SDK initialization is now handled by FarcasterSDKInit component in layout




  // Balance check disabled - contract is on Sepolia testnet, not mainnet
  // This was causing 30-60s hangs when the miniapp loads on mainnet
  // useEffect(() => {
  //   const checkBalance = async () => {
  //     if (!address || !publicClient) return;

  //     try {
  //       const balance = await publicClient.readContract({
  //         address: GEN1_CONTRACT_ADDRESS as `0x${string}`,
  //         abi: gen1ABI,
  //         functionName: 'balanceOf',
  //         args: [address],
  //       });

  //       const balanceValue = BigInt(balance as unknown as bigint);
  //       setUserBalance(balanceValue);

  //       // If user has NFTs, find the first tokenId they own
  //       if (balanceValue > BigInt(0)) {
  //         // For now, we'll find the tokenId by checking sequentially (inefficient but simple)
  //         // In production, you might want to cache this or use an indexer
  //         for (let i = 1; i <= 1111; i++) {
  //           try {
  //             const owner = await publicClient.readContract({
  //               address: GEN1_CONTRACT_ADDRESS as `0x${string}`,
  //               abi: gen1ABI,
  //               functionName: 'ownerOf',
  //               args: [BigInt(i)],
  //             });

  //             const ownerAddress = owner as string;
  //             if (ownerAddress.toLowerCase() === address.toLowerCase()) {
  //               setUserTokenId(i);
  //               break;
  //             }
  //           } catch {
  //             // Token doesn't exist yet, continue
  //             continue;
  //           }
  //         }
  //       }
  //     } catch (err) {
  //       console.error('Error checking balance:', err);
  //     }
  //   };

  //   checkBalance();
  //   const interval = setInterval(checkBalance, 10000); // Check every 10 seconds
  //   return () => clearInterval(interval);
  // }, [address, publicClient]);


  // Fetch mint price and supply
  useEffect(() => {
    const fetchData = async () => {
      if (!publicClient) return;

      try {
        const price: any = await publicClient.readContract({
          address: GEN1_CONTRACT_ADDRESS,
          abi: gen1ABI,
          functionName: 'mintPrice',
        });
        setContractMintPrice(price as bigint);

        const supply: any = await publicClient.readContract({
          address: GEN1_CONTRACT_ADDRESS,
          abi: gen1ABI,
          functionName: 'totalSupply',
        });
        setTotalSupply(supply as bigint);
      } catch (err) {
        console.error('Error fetching contract data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Handle mint
  const handleMint = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet');
      return;
    }

    if (!contractMintPrice) {
      alert('Loading mint price... please wait');
      return;
    }

    if (totalSupply !== null && Number(totalSupply) >= MAX_SUPPLY) {
      alert(`Maximum supply of ${MAX_SUPPLY} reached!`);
      return;
    }

    setIsMinting(true);
    setMintProgress(0);

    try {
      // Step 1: Get AI analysis FIRST (if user has Farcaster account)
      let renderSettings = {
        flowField: { enabled: true, baseFrequency: 0.02, amplitude: 1, octaves: 1, color1: '#4ade80', color2: '#22d3ee', rotation: 0.5, direction: 1 },
        flowFields: { enabled: true, baseFrequency: 0.01, amplitude: 1, octaves: 1, lineLength: 20, lineDensity: 0.1, rotation: 0.3, direction: 1 },
        contour: { enabled: true, baseFrequency: 0.01, amplitude: 1, octaves: 4, levels: 5, smoothness: 0.3 },
        contourAffectsFlow: true,
      };

      // If user is in Farcaster, run AI analysis first
      if (isInFarcaster) {
        try {
          setLoadingMessage('🤖 Analyzing your Farcaster mood...');
          const context = await sdk.context;
          const username = context?.user?.username;

          if (username) {
            const moodResponse = await fetch('/api/gen1/farcaster-mood', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: username,
                password: '',
                autoTrigger: true, // Auto-trigger for minting
              }),
            });

            if (moodResponse.ok) {
              const moodData = await moodResponse.json();

              // Use AI-recommended settings for rendering
              renderSettings = {
                flowField: {
                  enabled: true,
                  baseFrequency: moodData.flowFieldBaseFrequency || moodData.baseFrequency || 0.02,
                  amplitude: 1,
                  octaves: 1,
                  color1: moodData.color1 || '#4ade80',
                  color2: moodData.color2 || '#22d3ee',
                  rotation: 0.5,
                  direction: 1,
                },
                flowFields: {
                  enabled: true,
                  baseFrequency: moodData.flowFieldsBaseFrequency || moodData.baseFrequency || 0.01,
                  amplitude: 1,
                  octaves: 1,
                  lineLength: 20,
                  lineDensity: Math.min(moodData.flowLineDensity || 0.1, 0.5), // Never exceed 0.5
                  rotation: 0.3,
                  direction: 1,
                },
                contour: {
                  enabled: true,
                  baseFrequency: moodData.flowFieldBaseFrequency || moodData.baseFrequency || 0.01,
                  amplitude: 1,
                  octaves: 4,
                  levels: 5,
                  smoothness: 0.3,
                },
                contourAffectsFlow: true,
              };

              console.log('✅ Using AI-recommended settings for rendering:', renderSettings);
            }
          }
        } catch (error) {
          console.log('⚠️ AI analysis failed, using default settings:', error);
          // Continue with default settings if AI analysis fails
        }
      }

      // Step 2: Queue the render job with AI settings (or defaults)
      setLoadingMessage('🎨 Generating unique animation...');
      const response = await fetch('/api/gen1/queue-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: renderSettings,
          walletAddress: address,
        }),
      });

      if (!response.ok) throw new Error('Failed to queue mint');

      const { jobId } = await response.json();
      console.log('Job queued:', jobId);

      // Step 2: Poll for completion
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/gen1/job-status?jobId=${jobId}`);
        const status = await statusRes.json();

        setMintProgress(status.progress || 0);

        if (status.status === 'completed') {
          clearInterval(interval);
          setLoadingMessage('📝 Minting on-chain...');

          // Store image URL for cast sharing
          setMintedImageUrl(status.result.imageUrl || status.result.videoUrl || null);

          // Step 3: Mint on-chain
          writeContract({
            address: GEN1_CONTRACT_ADDRESS,
            abi: gen1ABI,
            functionName: 'mint',
            args: [status.result.imageUrl, status.result.metadataUrl],
            value: contractMintPrice,
            chainId: 8453,
          } as any);

          setLoadingMessage('');
          setIsMinting(false);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setIsMinting(false);
          setLoadingMessage('');
          alert('Failed to generate animation. Please try again.');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Mint error:', err);
      setIsMinting(false);
      setLoadingMessage('');
      alert('Error: ' + err.message);
    }
  };

  // Handle mint confirmation
  useEffect(() => {
    if (isConfirmed && hash && publicClient) {
      const handleMintSuccess = async () => {
        try {
          // Get transaction receipt to extract token ID from Gen1Minted event
          const receipt = await publicClient.getTransactionReceipt({ hash });

          let tokenId: bigint | null = null;
          if (receipt.logs) {
            // Parse Gen1Minted event to get tokenId
            for (const log of receipt.logs) {
              try {
                const parsedLog = decodeEventLog({
                  abi: gen1ABI,
                  data: log.data,
                  topics: log.topics,
                });

                if (parsedLog.eventName === 'Gen1Minted' && parsedLog.args && 'tokenId' in parsedLog.args && parsedLog.args.tokenId) {
                  tokenId = parsedLog.args.tokenId as bigint;
                  console.log('[Mint] Token ID from event:', tokenId.toString());
                  break;
                }
              } catch (err) {
                // Not the event we're looking for, continue
              }
            }
          }

          alert('✅ Mint successful!');
          setIsMinting(false);
          setLoadingMessage('');
          setMintProgress(0);

          // Track mint in database
          try {
            await fetch('/api/webhooks/mint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tokenId: tokenId ? tokenId.toString() : null,
                minterAddress: address?.toLowerCase(),
                blockNumber: receipt.blockNumber?.toString(),
                transactionHash: hash,
                imageUrl: null, // Will be updated when we have it
                metadataUrl: null, // Will be updated when we have it
              }),
            });
            console.log('[Mint] Mint tracked in database');
          } catch (error) {
            console.error('[Mint] Failed to track mint in database:', error);
            // Don't fail the mint if tracking fails
          }

          // Auto-save AI mood analysis if user has Farcaster account
          if (isInFarcaster) {
            try {
              const context = await sdk.context;
              const fid = context?.user?.fid;
              const username = context?.user?.username;

              if (fid && username) {
                console.log('[Mint] Auto-triggering AI mood analysis for FID:', fid);

                // Trigger AI mood analysis (auto-trigger, no password required)
                const moodResponse = await fetch('/api/gen1/farcaster-mood', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: username,
                    password: '',
                    autoTrigger: true, // Flag to skip password check for auto-trigger
                  }),
                });

                if (moodResponse.ok) {
                  const moodData = await moodResponse.json();

                  // Save analysis to database
                  const saveResponse = await fetch('/api/mood-analysis/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fid,
                      walletAddress: address?.toLowerCase(),
                      tokenId: tokenId ? tokenId.toString() : null,
                      mood: moodData.mood,
                      personality: moodData.personality,
                      traits: moodData.traits,
                      interests: moodData.interests,
                      reasoning: moodData.reasoning,
                      color1: moodData.color1,
                      color2: moodData.color2,
                      baseFrequency: moodData.baseFrequency,
                      flowFieldBaseFrequency: moodData.flowFieldBaseFrequency,
                      flowFieldsBaseFrequency: moodData.flowFieldsBaseFrequency,
                      flowLineDensity: moodData.flowLineDensity,
                      postsAnalyzed: moodData.postsAnalyzed,
                    }),
                  });

                  if (saveResponse.ok) {
                    console.log('[Mint] AI mood analysis saved successfully');
                  } else {
                    console.error('[Mint] Failed to save mood analysis:', await saveResponse.text());
                  }
                } else {
                  // Password required or analysis failed - skip silently
                  console.log('[Mint] Mood analysis skipped (password required or unavailable)');
                }
              }
            } catch (error) {
              // Silently fail - analysis is optional
              console.log('[Mint] Could not auto-save mood analysis:', error);
            }

            // Auto-share cast about successful mint
            try {
              const context = await sdk.context;
              const fid = context?.user?.fid;

              if (fid) {
                const appUrl = typeof window !== 'undefined'
                  ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
                  : process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz';

                // Prepare embeds: use image/video if available, otherwise just miniapp URL
                // Type must be: [] | [string] | [string, string] | undefined
                let embeds: [] | [string] | [string, string] | undefined;
                if (mintedImageUrl) {
                  // Convert IPFS URL to gateway URL for Farcaster
                  const imageUrl = mintedImageUrl.startsWith('ipfs://')
                    ? `https://ipfs.io/ipfs/${mintedImageUrl.replace('ipfs://', '')}`
                    : mintedImageUrl;
                  embeds = [imageUrl, appUrl]; // Type: [string, string]
                } else {
                  embeds = [appUrl]; // Type: [string]
                }

                // Compose cast with mint message
                const castResult = await sdk.actions.composeCast({
                  text: 'I just minted my Mood NFT by @ionoi!',
                  embeds: embeds,
                });

                if (castResult?.cast) {
                  console.log('[Mint] Cast shared successfully');
                } else {
                  // User may have cancelled - that's okay
                  console.log('[Mint] Cast sharing cancelled by user');
                }
              }
            } catch (error) {
              // Silently fail - cast sharing is optional
              console.log('[Mint] Could not share cast:', error);
            }

            // Send notification about successful mint
            try {
              const context = await sdk.context;
              const fid = context?.user?.fid;

              if (fid) {
                await fetch('/api/notifications/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fid,
                    title: '🎉 Gen1 NFT Minted!',
                    body: 'Your animated Gen1 NFT has been successfully minted on Base.',
                    url: `${window.location.origin}?minted=true`
                  })
                });
              }
            } catch (error) {
              // Silently fail - notifications are optional
              console.log('Could not send mint notification:', error);
            }
          }

          // Clear minted image URL after sharing
          setMintedImageUrl(null);
        } catch (error) {
          console.error('[Mint] Error handling mint success:', error);
          alert('✅ Mint successful! (Note: Some post-mint actions may have failed)');
          setIsMinting(false);
          setLoadingMessage('');
          setMintProgress(0);
        }
      };

      handleMintSuccess();
    }
  }, [isConfirmed, hash, publicClient, isInFarcaster, address, mintedImageUrl]);




  return (
    <div
      className="min-h-screen relative"
      style={{
        width: '100%',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto p-4" style={{ width: '100%', maxWidth: '100%', minHeight: 'calc(100vh - 64px)', background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05), rgba(0, 0, 0, 0.8))' }}>

        {loadingMessage && (
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

        {mounted && !isInFarcaster && !isConnected && (
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

        {mounted && isInFarcaster && (isConnectingWallet || !isConnected) && (
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>⏳ Connecting Farcaster Wallet...</p>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>Your wallet is being connected automatically...</p>
          </div>
        )}

        {/* Mint Interface */}
        {mounted && isConnected && (
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
                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                borderRadius: '16px',
                padding: '20px',
                border: '2px solid rgba(147, 51, 234, 0.4)',
                maxWidth: '350px',
                margin: '0 auto'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#9333ea', marginBottom: '12px' }}>🎁 Example Gen1 NFT (Token #1)</h3>
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
                    href={`https://basescan.org/nft/${GEN1_CONTRACT_ADDRESS}/1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#22d3ee', textDecoration: 'underline' }}
                  >
                    View on Basescan →
                  </a>
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                  Live on Base mainnet
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

            {/* Early buyer notice */}
            <div style={{ backgroundColor: 'rgba(147, 51, 234, 0.15)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(147, 51, 234, 0.4)', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                💡 <strong style={{ color: '#9333ea' }}>Early Buyer Advantage:</strong> Price may increase as new features are added. Early buyers are smart! 🔥
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                Limited to {MAX_SUPPLY} total mints
              </p>
            </div>

            {/* Mint Button */}
            <button
              onClick={handleMint}
              disabled={!isConnected || isMinting || isConfirming || !contractMintPrice}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ffffff',
                background: isConnected && !isMinting && !isConfirming && contractMintPrice
                  ? 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                border: 'none',
                cursor: isConnected && !isMinting && !isConfirming && contractMintPrice ? 'pointer' : 'not-allowed',
                opacity: isConnected && !isMinting && !isConfirming && contractMintPrice ? 1 : 0.6,
                transition: 'all 0.3s',
                boxShadow: isConnected && !isMinting && !isConfirming && contractMintPrice
                  ? '0 4px 12px rgba(147, 51, 234, 0.4)'
                  : 'none',
              }}
            >
              {!isConnected ? '🔗 Connect Wallet to Mint' :
               isMinting ? `🎨 Generating ${mintProgress}%...` :
               isConfirming ? '⏳ Minting on-chain...' :
               totalSupply !== null && Number(totalSupply) >= MAX_SUPPLY ? '❌ Sold Out' :
               contractMintPrice ? `🚀 Mint Gen1 NFT (${Number(contractMintPrice) / 1e18} ETH)` :
               '⏳ Loading...'}
            </button>

            {contractMintPrice && totalSupply !== null && (
              <p style={{
                textAlign: 'center',
                marginTop: '12px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                {totalSupply.toString()} / {MAX_SUPPLY} minted
              </p>
            )}

          </div>
        )}
        </div>

    </div>
  );
}

export function Gen1MainApp() {
  return <Gen1AppContent />;
}
