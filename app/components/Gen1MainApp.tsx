'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi';
import { gen1ABI } from '../gen1-creator/abi';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';
import { sdk } from '@farcaster/miniapp-sdk';

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
      // Step 1: Queue the render job with default Gen1 base settings
      setLoadingMessage('🎨 Generating unique animation...');
      const response = await fetch('/api/gen1/queue-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            flowField: { enabled: true, baseFrequency: 0.02, amplitude: 1, octaves: 1, color1: '#4ade80', color2: '#22d3ee', rotation: 0.5, direction: 1 },
            flowFields: { enabled: true, baseFrequency: 0.01, amplitude: 1, octaves: 1, lineLength: 20, lineDensity: 0.1, rotation: 0.3, direction: 1 },
            contour: { enabled: true, baseFrequency: 0.01, amplitude: 1, octaves: 4, levels: 5, smoothness: 0.3 },
            contourAffectsFlow: true,
          },
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
    if (isConfirmed) {
      alert('✅ Mint successful!');
      setIsMinting(false);
      setLoadingMessage('');
      setMintProgress(0);

      // Send notification if user is in Farcaster miniapp
      if (isInFarcaster) {
        const sendMintNotification = async () => {
          try {
            // Get user's FID from Farcaster context
            const context = await sdk.context;
            const fid = context?.user?.fid;

            if (fid) {
              // Send notification about successful mint
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
        };

        sendMintNotification();
      }
    }
  }, [isConfirmed, isInFarcaster]);




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
