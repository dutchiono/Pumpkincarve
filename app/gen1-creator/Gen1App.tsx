'use client';

import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import GIF from 'gif.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { gen1ABI } from './abi';

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

const DEFAULT_FARCASTER_USER_ID = '';
// Get contract addresses based on network
const CONTRACT_ADDRESS_BASE_SEPOLIA = (process.env.NEXT_PUBLIC_SEPOLIA_GEN1_NFT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0xE671CA8cDA72a70Ca4adb8BCfA03631FCfFe2cE8') as `0x${string}`;
const CONTRACT_ADDRESS_BASE_MAINNET = (process.env.NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS || '0x9d394EAD99Acab4cF8e65cdA3c8e440fB7D27087') as `0x${string}`;

const Gen1Creator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [farcasterUserId, setFarcasterUserId] = useState<string>(DEFAULT_FARCASTER_USER_ID);
  const [farcasterMood, setFarcasterMood] = useState<string | null>(null);
  const [farcasterPersonality, setFarcasterPersonality] = useState<string | null>(null);
  const [postsAnalyzed, setPostsAnalyzed] = useState<number>(0);
  const [recommendedColor1, setRecommendedColor1] = useState<string | null>(null);
  const [recommendedColor2, setRecommendedColor2] = useState<string | null>(null);
  const [recommendedFrequency, setRecommendedFrequency] = useState<number | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [contractMintPrice, setContractMintPrice] = useState<bigint | null>(null);

  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Track current chain
  useEffect(() => {
    if (chainId) {
      setCurrentChainId(chainId);
      const chainName = chainId === 8453 ? 'BASE MAINNET' : (chainId === 84532 ? 'BASE SEPOLIA' : `UNKNOWN (${chainId})`);
      console.log('🔄 Chain changed to:', chainName);
      console.log('📍 Current chain ID:', chainId);
      console.log('📍 Chain ID breakdown:', {
        chainId,
        is8453: chainId === 8453,
        is84532: chainId === 84532,
        expectedMainnet: 8453,
        expectedSepolia: 84532
      });
    }
  }, [chainId]);

  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [mintCount, setMintCount] = useState<number>(1);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Auto-detect if we're on mainnet (8453) or sepolia (84532)
  const isMainnet = currentChainId === 8453;
  const isSepolia = currentChainId === 84532;

  // Helper to get contract address based on CURRENT CHAIN
  const getContractAddress = () => {
    if (!currentChainId) return CONTRACT_ADDRESS_BASE_SEPOLIA; // Default to Sepolia if not connected
    return currentChainId === 8453 ? CONTRACT_ADDRESS_BASE_MAINNET : CONTRACT_ADDRESS_BASE_SEPOLIA;
  };

  const getChainId = () => {
    if (!currentChainId) return 84532; // Default to Sepolia if not connected
    return currentChainId === 8453 ? 8453 : 84532;
  };

  const getNetworkName = () => {
    if (!currentChainId) return 'NOT CONNECTED';
    return currentChainId === 8453 ? 'BASE MAINNET' : currentChainId === 84532 ? 'BASE SEPOLIA' : `UNKNOWN (${currentChainId})`;
  };

  const { data: hash, writeContract, isPending: isMinting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash,
  });

  const [tokenIdToUpdate, setTokenIdToUpdate] = useState<number | undefined>(undefined);
  const [currentNFTMetadata, setCurrentNFTMetadata] = useState<any | null>(null);
  const [isFetchingNFTMetadata, setIsFetchingNFTMetadata] = useState<boolean>(false);
  const [fetchNFTMetadataError, setFetchNFTMetadataError] = useState<Error | null>(null);

  const publicClient = usePublicClient();

  // Log write errors
  useEffect(() => {
    if (writeError) {
      console.error('❌ WriteContract error:', writeError);
      alert('Transaction error: ' + writeError.message);
    }
  }, [writeError]);

  // Handle post-mint IPFS upload and metadata update
  useEffect(() => {
    if (isConfirmed && hash && address) {
      console.log('✅ Mint confirmed - starting IPFS upload...');

      publicClient?.getTransactionReceipt({ hash }).then(async (receipt) => {
        if (receipt && receipt.logs.length > 0) {
          // Parse logs to find Gen1Minted event and extract token ID
          const gen1ABIRef = gen1ABI; // Gen1 ABI reference
          let tokenId: number | null = null;

          for (const log of receipt.logs) {
            // Look for Gen1Minted event (indexed to, tokenId, imageUrl)
            if (log.topics.length === 3) {
              try {
                // Extract tokenId from log topics (it's the second indexed topic)
                tokenId = Number(log.topics[2]);
                console.log('✅ Found token ID:', tokenId);
                break;
              } catch (e) {
                console.error('Error parsing log:', e);
              }
            }
          }

          if (!tokenId) {
            console.error('❌ Could not extract token ID from logs');
            return;
          }

          try {
            // Step 1: Capture and upload GIF to IPFS
            console.log('📹 Capturing canvas as animated GIF...');
            const gifBlob = await exportCanvasAsGIF();
            console.log('✓ GIF captured, size:', gifBlob.size, 'bytes');

            console.log('🌐 Uploading GIF to IPFS...');
            const formData = new FormData();
            formData.append('gif', gifBlob, 'gen1-animation.gif');

            const uploadResponse = await fetch('/api/gen3/upload-gif', {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error('Failed to upload GIF to IPFS');
            }

            const { ipfsUrl: imageUrl } = await uploadResponse.json();
            console.log('✓ Image uploaded to IPFS:', imageUrl);

            // Step 2: Fetch user FID and username (REQUIRED traits)
            let minterFID = null;
            let minterUsername = null;
            const minterAddress = address || '';

            if (address) {
              try {
                const userInfoResponse = await fetch('/api/get-user-info', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address }),
                });

                if (userInfoResponse.ok) {
                  const userInfo = await userInfoResponse.json();
                  minterFID = userInfo.fid;
                  minterUsername = userInfo.username;
                  console.log(`👤 Found user: ${minterUsername} (FID: ${minterFID})`);
                } else {
                  console.warn('Could not fetch user info - will use fallback');
                }
              } catch (err) {
                console.warn('Could not fetch user info:', err);
              }
            }

            // Step 3: Create metadata JSON
            const now = new Date();
            const metadata = {
              name: `Gen1 #${tokenId}`,
              description: 'A generative Gen1 NFT with dynamic visual layers',
              image: imageUrl,
              animation_url: imageUrl,
              attributes: [
                {
                  trait_type: 'Iteration',
                  value: 1,
                },
                {
                  trait_type: 'Created',
                  value: now.toISOString(),
                },
                {
                  trait_type: 'Creator FID',
                  value: minterFID || '',
                },
                {
                  trait_type: 'Creator',
                  value: minterUsername || '',
                },
                {
                  trait_type: 'Minter',
                  value: minterAddress,
                },
                {
                  trait_type: 'Holder',
                  value: minterAddress, // Initially holder is same as minter
                },
              ],
              properties: {
                flowField: {
                  enabled: enableFlowField,
                  color1: flowColor1,
                  color2: flowColor2,
                  baseFrequency: flowFieldBaseFreq,
                  amplitude: flowFieldAmplitude,
                  octaves: flowFieldOctaves,
                  rotation: flowFieldRotation,
                  direction: flowFieldDirection,
                },
                flowFields: {
                  enabled: enableFlowFields,
                  baseFrequency: flowFieldsBaseFreq,
                  amplitude: flowFieldsAmplitude,
                  octaves: flowFieldsOctaves,
                  lineLength: flowLineLength,
                  lineDensity: flowLineDensity,
                  rotation: flowFieldsRotation,
                  direction: flowFieldsDirection,
                },
                contour: {
                  enabled: enableContourMapping,
                  baseFrequency: contourBaseFreq,
                  amplitude: contourAmplitude,
                  octaves: contourOctaves,
                  levels: contourLevels,
                  smoothness: contourSmoothness,
                },
                contourAffectsFlow,
              },
            };

            // Step 3: Update NFT metadata via relayer API
            console.log('🔧 Updating NFT metadata via relayer...');
            const updateResponse = await fetch('/api/update-nft-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tokenId,
                imageUrl,
                metadata: JSON.stringify(metadata),
              }),
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update NFT metadata');
            }

            console.log('✅ NFT metadata updated successfully!');

            // Step 4: Send notification
            try {
              const res = await fetch('/api/notifications/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transactionHash: hash,
                  minterAddress: address,
                  tokenId: tokenId.toString(),
                }),
              });

              if (res.ok) {
                console.log('✅ Mint notification sent');
              }
            } catch (notifErr) {
              console.error('❌ Notification error:', notifErr);
            }
          } catch (uploadErr: any) {
            console.error('❌ Post-mint upload error:', uploadErr);
            alert('Mint successful, but failed to upload GIF. NFT was minted with placeholder. Please contact support.');
          }
        }
      }).catch((err) => {
        console.error('❌ Failed to get transaction receipt:', err);
      });
    }
  }, [isConfirmed, hash, address, publicClient]);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [isGeneratingRender, setIsGeneratingRender] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isUpdatingOnChain, setIsUpdatingOnChain] = useState<boolean>(false);

  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchStatus, setBatchStatus] = useState<string>('Idle');
  const [lastBatchRunTimestamp, setLastBatchRunTimestamp] = useState<number | null>(null);

  // Track pinned CIDs for cleanup
  const [currentNFTImageCid, setCurrentNFTImageCid] = useState<string | null>(null);
  const [currentNFTMetadataCid, setCurrentNFTMetadataCid] = useState<string | null>(null);

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
    // This is now just a trigger for handleUpdateOnChain
    // The actual rendering, upload, and update happens in handleUpdateOnChain
    alert('Click "Update On-Chain" to generate new render, upload to IPFS, and update the contract.');
  }, []);

  // Helper to delete old IPFS files by CID via API route
  const deleteOldFilesByCid = async (oldImageCid?: string, oldMetadataCid?: string) => {
    if (!oldImageCid && !oldMetadataCid) {
      console.log('No old CIDs to delete');
      return; // Nothing to delete
    }

    console.log('🧹 Deleting old IPFS files from Pinata...');
    if (oldImageCid) console.log('  Old image CID:', oldImageCid);
    if (oldMetadataCid) console.log('  Old metadata CID:', oldMetadataCid);

    const deletePromises = [] as Promise<void>[];

    if (oldImageCid) {
      deletePromises.push(
        fetch('/api/delete-pinata-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cid: oldImageCid }),
        }).then(res => {
          if (res.ok) {
            console.log('✓ Deleted old image from Pinata');
          } else {
            console.warn('⚠️ Failed to delete old image:', res.status);
          }
        })
      );
    }

    if (oldMetadataCid) {
      deletePromises.push(
        fetch('/api/delete-pinata-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cid: oldMetadataCid }),
        }).then(res => {
          if (res.ok) {
            console.log('✓ Deleted old metadata from Pinata');
          } else {
            console.warn('⚠️ Failed to delete old metadata:', res.status);
          }
        })
      );
    }

    try {
      await Promise.all(deletePromises);
      console.log('✓ Old files deleted successfully from Pinata');
    } catch (err) {
      console.warn('⚠️ Failed to delete old files from Pinata:', err);
      // Don't throw - this is cleanup, not critical
    }
  };

  const handleUpdateOnChain = useCallback(async () => {
    if (!tokenIdToUpdate) return;

    setIsUpdatingOnChain(true);

    try {
      const contractAddress = getContractAddress();
      const networkName = getNetworkName();
      console.log('🔧 Starting NFT update...');
      console.log('📍 Network:', networkName);
      console.log('📍 Contract:', contractAddress);
      console.log('📍 Token ID:', tokenIdToUpdate);

      // Step 0: Fetch current metadata to get old CIDs and iteration
      console.log('🔍 STEP 0: Fetching current NFT metadata...');

      let existingMetadata: any = null;
      let oldImageCid: string | undefined;
      let oldMetadataCid: string | undefined;
      let currentIteration = 0;

      console.log('🔍 ABOUT TO ENTER TRY BLOCK FOR FETCH');
      try {
        console.log('🔍 INSIDE TRY, checking if (publicClient && tokenIdToUpdate)');
        console.log('🔍 publicClient:', publicClient);
        console.log('🔍 tokenIdToUpdate:', tokenIdToUpdate);

        if (publicClient && tokenIdToUpdate) {
          console.log('🔍 INSIDE IF BLOCK - going to fetch');
          console.log('  Calling tokenURI on contract for token:', tokenIdToUpdate);
          const existingTokenURI: any = await publicClient.readContract({
            address: getContractAddress(),
            abi: gen1ABI,
            functionName: 'tokenURI',
            args: [BigInt(tokenIdToUpdate)],
          });

          console.log('  Received tokenURI:', existingTokenURI);
          console.log('  tokenURI type:', typeof existingTokenURI);
          console.log('  tokenURI starts with ipfs:', (existingTokenURI as any)?.startsWith?.('ipfs://'));

          // Check if it's an IPFS URL or raw JSON
          if (existingTokenURI && typeof existingTokenURI === 'string') {
            if (existingTokenURI.startsWith('ipfs://')) {
              // It's an IPFS URL - fetch from gateway
              const cid = existingTokenURI.replace('ipfs://', '');
              console.log('  Current metadata CID:', cid);

              const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
              console.log('  Fetch response status:', response.status);
              if (response.ok) {
                existingMetadata = await response.json();
              } else {
                console.log('  Failed to fetch from IPFS, status:', response.status);
              }
            } else if (existingTokenURI.startsWith('{') || existingTokenURI.startsWith('[')) {
              // It's raw JSON stored in contract
              console.log('  TokenURI contains raw JSON metadata');
              try {
                existingMetadata = JSON.parse(existingTokenURI);
                console.log('  Parsed JSON metadata directly from contract');
              } catch (e) {
                console.log('  Failed to parse JSON:', e);
              }
            }

            if (existingMetadata) {
              console.log('  Fetched existing metadata successfully');
              console.log('  Metadata has attributes:', !!existingMetadata.attributes);
              console.log('  Attributes array:', Array.isArray(existingMetadata.attributes));

              // Extract old CIDs from properties
              if (existingMetadata.properties?.oldCids) {
                oldImageCid = existingMetadata.properties.oldCids.previousImageCid;
                oldMetadataCid = existingMetadata.properties.oldCids.previousMetadataCid;
                console.log('  Found old CIDs to delete:', { oldImageCid, oldMetadataCid });
              }

              // Extract current iteration
              if (existingMetadata.attributes && Array.isArray(existingMetadata.attributes)) {
                console.log('  Searching for Iteration attribute in:', existingMetadata.attributes);
                const iterationAttr = existingMetadata.attributes.find((attr: any) => attr.trait_type === 'Iteration');
                if (iterationAttr) {
                  currentIteration = typeof iterationAttr.value === 'number' ? iterationAttr.value : 0;
                  console.log('  Current iteration:', currentIteration);
                } else {
                  console.log('  No Iteration attribute found in attributes array');
                }
              } else {
                console.log('  Attributes is not an array or missing');
              }
            }
          } else {
            console.log('  TokenURI is not a string or is invalid');
          }
        } else {
          console.log('  Missing publicClient or tokenIdToUpdate:', { hasPublicClient: !!publicClient, tokenIdToUpdate });
        }
      } catch (err) {
        console.log('⚠️ Could not fetch existing metadata:', err);
      }

      // Step 1: Capture canvas as animated GIF
      console.log('📹 Capturing canvas as animated GIF for update...');
      const gifBlob = await exportCanvasAsGIF();
      console.log('✓ GIF captured, size:', gifBlob.size, 'bytes');

      // Step 2: Upload GIF to IPFS
      console.log('🌐 Uploading GIF to IPFS...');
      const formData = new FormData();
      formData.append('gif', gifBlob, 'gen3-animation.gif');

      const uploadResponse = await fetch('/api/gen3/upload-gif', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload GIF to IPFS');
      }

      const { ipfsUrl: imageUrl } = await uploadResponse.json();
      console.log('✓ Image uploaded to IPFS:', imageUrl);

      // Track the new image CID
      const imageCid = imageUrl.replace('ipfs://', '');
      setCurrentNFTImageCid(imageCid);

      // Step 3: Create metadata JSON with current settings
      const newIteration = currentIteration + 1;
      console.log('📊 ITERATION DEBUG:');
      console.log('  - currentIteration fetched:', currentIteration);
      console.log('  - newIteration will be:', newIteration);
      const now = new Date();

      // Preserve Creator and Minter traits from existing metadata
      const existingAttributes = (existingMetadata && existingMetadata.attributes) || [];
      const minterAttr = existingAttributes.find((attr: any) => attr.trait_type === 'Minter');
      const creatorFIDAttr = existingAttributes.find((attr: any) => attr.trait_type === 'Creator FID');
      const creatorAttr = existingAttributes.find((attr: any) => attr.trait_type === 'Creator');

      // Get current holder from contract
      let currentHolderAddress = '';
      let currentHolderFID: any = null;
      let currentHolderUsername: any = null;

      if (publicClient) {
        try {
          const ownerAddress = await publicClient.readContract({
            address: getContractAddress(),
            abi: [
              {
                inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
                name: 'ownerOf',
                outputs: [{ internalType: 'address', name: '', type: 'address' }],
                stateMutability: 'view',
                type: 'function',
              },
            ],
            functionName: 'ownerOf',
            args: [BigInt(tokenIdToUpdate || 0)],
          });

          currentHolderAddress = ownerAddress as string;
          console.log('📦 Current holder from contract:', currentHolderAddress);

          // Look up holder's FID/username
          if (currentHolderAddress && currentHolderAddress !== '0x0000000000000000000000000000000000000000') {
            try {
              const holderInfoResponse = await fetch('/api/get-user-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: currentHolderAddress }),
              });

              if (holderInfoResponse.ok) {
                const holderInfo = await holderInfoResponse.json();
                currentHolderFID = holderInfo.fid;
                currentHolderUsername = holderInfo.username;
                console.log(`👤 Current holder: ${currentHolderUsername} (FID: ${currentHolderFID})`);
              }
            } catch (err) {
              console.warn('Could not fetch holder info:', err);
            }
          }
        } catch (err) {
          console.error('Could not read contract owner:', err);
        }
      }

      const metadata: any = {
        name: `Gen1 #${tokenIdToUpdate}`,
        description: 'A generative Gen1 NFT with dynamic visual layers',
        image: imageUrl,
        animation_url: imageUrl,
        // OpenSea-compatible attributes array for wallet display
        attributes: [
          {
            trait_type: 'Iteration',
            value: newIteration,
          },
          {
            trait_type: 'Last Updated',
            value: now.toISOString(),
          },
          ...(creatorFIDAttr ? [creatorFIDAttr] : []),
          ...(creatorAttr ? [creatorAttr] : []),
          ...(minterAttr ? [minterAttr] : []),
          {
            trait_type: 'Holder',
            value: currentHolderAddress || '',
          },
          {
            trait_type: 'Holder FID',
            value: currentHolderFID || '',
          },
          {
            trait_type: 'Holder Username',
            value: currentHolderUsername || '',
          },
        ],
        // Store all settings and old CIDs in properties object
        properties: {
          flowField: {
            enabled: enableFlowField,
            color1: flowColor1,
            color2: flowColor2,
            baseFrequency: flowFieldBaseFreq,
            amplitude: flowFieldAmplitude,
            octaves: flowFieldOctaves,
            rotation: flowFieldRotation,
            direction: flowFieldDirection,
          },
          flowFields: {
            enabled: enableFlowFields,
            baseFrequency: flowFieldsBaseFreq,
            amplitude: flowFieldsAmplitude,
            octaves: flowFieldsOctaves,
            lineLength: flowLineLength,
            lineDensity: flowLineDensity,
            rotation: flowFieldsRotation,
            direction: flowFieldsDirection,
          },
          contour: {
            enabled: enableContourMapping,
            baseFrequency: contourBaseFreq,
            amplitude: contourAmplitude,
            octaves: contourOctaves,
            levels: contourLevels,
            smoothness: contourSmoothness,
          },
          contourAffectsFlow,
          // Store current CIDs as "old" for next update
          oldCids: {
            previousImageCid: imageCid,
            previousMetadataCid: undefined, // Will be set after metadata upload
          },
        },
      };

      // Step 4: Upload metadata to IPFS
      console.log('🌐 Uploading metadata to IPFS...');
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const metadataFormData = new FormData();
      metadataFormData.append('gif', new Blob([metadataBuffer], { type: 'application/json' }), 'metadata.json');

      const metadataUploadResponse = await fetch('/api/gen3/upload-gif', {
        method: 'POST',
        body: metadataFormData,
      });

      if (!metadataUploadResponse.ok) {
        const errorData = await metadataUploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
      }

      const { ipfsUrl: metadataUrl } = await metadataUploadResponse.json();
      console.log('✓ Metadata uploaded to IPFS:', metadataUrl);

      // Track the new metadata CID
      const metadataCid = metadataUrl.replace('ipfs://', '');
      setCurrentNFTMetadataCid(metadataCid);

      // Update metadata with the actual previousMetadataCid
      metadata.properties.oldCids.previousMetadataCid = metadataCid;

      // Step 5: Update NFT on-chain via relayer API (backend)
      console.log('🔧 Updating NFT metadata via relayer API...');
      const updateResponse = await fetch('/api/update-nft-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenIdToUpdate,
          imageUrl,
          metadata: JSON.stringify(metadata),
          network: isMainnet ? 'mainnet' : 'sepolia',
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update NFT metadata');
      }

      console.log('✅ NFT metadata updated successfully via relayer!');

      // Step 6: Delete old files from Pinata (cleanup)
      console.log('🧹 Cleaning up old files from Pinata...');
      await deleteOldFilesByCid(oldImageCid, oldMetadataCid);

    } catch (err: any) {
      console.error('Error updating NFT:', err);
      // Only show alert if it's not the ownership check
      if (!err.message?.includes('Not the owner')) {
        alert('Error updating NFT: ' + err.message);
      }
    } finally {
    setIsUpdatingOnChain(false);
    }
  }, [tokenIdToUpdate, enableFlowField, enableFlowFields, enableContourMapping, flowColor1, flowColor2, flowFieldBaseFreq, flowFieldAmplitude, flowFieldOctaves, flowFieldRotation, flowFieldDirection, flowFieldsBaseFreq, flowFieldsAmplitude, flowFieldsOctaves, flowLineLength, flowLineDensity, flowFieldsRotation, flowFieldsDirection, contourBaseFreq, contourAmplitude, contourOctaves, contourLevels, contourSmoothness, contourAffectsFlow, currentNFTImageCid, currentNFTMetadataCid, address, publicClient, writeContract]);

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

  // Apply mood-based settings to Canvas (for new NFTs)
  const handleApplyMoodToCanvas = useCallback(() => {
    if (!recommendedColor1 || !recommendedColor2 || recommendedFrequency === null) {
      alert('Please analyze a Farcaster mood first!');
      return;
    }

    // Apply AI-recommended settings
    setFlowColor1(recommendedColor1);
    setFlowColor2(recommendedColor2);
    setFlowFieldBaseFreq(recommendedFrequency);
    setFlowFieldsBaseFreq(recommendedFrequency);
    setContourBaseFreq(recommendedFrequency);

    alert(`✓ Mood settings applied to canvas!\n\nColors: ${recommendedColor1} & ${recommendedColor2}\nFrequency: ${recommendedFrequency}`);
  }, [recommendedColor1, recommendedColor2, recommendedFrequency]);

  // Apply mood-based settings to existing NFT (preserves NFT history)
  const handleApplyMoodToNFT = useCallback(() => {
    if (!currentNFTMetadata) {
      alert('Please load an NFT first (use NFT Viewer card)');
      return;
    }
    if (!recommendedColor1 || !recommendedColor2 || recommendedFrequency === null) {
      alert('Please analyze a Farcaster mood first!');
      return;
    }

    // Apply AI-recommended settings
    setFlowColor1(recommendedColor1);
    setFlowColor2(recommendedColor2);
    setFlowFieldBaseFreq(recommendedFrequency);
    setFlowFieldsBaseFreq(recommendedFrequency);
    setContourBaseFreq(recommendedFrequency);

    alert(`✓ Mood settings applied to NFT #${tokenIdToUpdate}!\n\nNext steps:\n1. Check the canvas preview\n2. Click "Generate Render" in On-Chain Actions\n3. Upload to IPFS\n4. Update On-Chain`);
  }, [currentNFTMetadata, tokenIdToUpdate, recommendedColor1, recommendedColor2, recommendedFrequency]);

  const handleFetchNFTMetadata = useCallback(async () => {
    if (tokenIdToUpdate === undefined) return;

    setIsFetchingNFTMetadata(true);
    setFetchNFTMetadataError(null);
    setCurrentNFTMetadata(null);

    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const contractAddress = getContractAddress();
      const networkName = getNetworkName();
      console.log('🔍 Fetching NFT metadata...');
      console.log('📍 Network:', networkName);
      console.log('📍 Contract:', contractAddress);
      console.log('📍 Token ID:', tokenIdToUpdate);

      // First, get the tokenURI from the contract
      const tokenURIResult: any = await publicClient.readContract({
        address: contractAddress,
        abi: gen1ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenIdToUpdate)],
      });

      if (tokenURIResult) {
        let metadata: any;

        // Check if tokenURIResult is already JSON metadata (after update)
        if (typeof tokenURIResult === 'string' && tokenURIResult.startsWith('{')) {
          // It's already JSON metadata
          metadata = JSON.parse(tokenURIResult);
        } else if (typeof tokenURIResult === 'string' && tokenURIResult.startsWith('ipfs://')) {
          // It's an IPFS URL - fetch from gateway
          const cid = tokenURIResult.replace('ipfs://', '');
          const gateways = [
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
          ];

          const response = await fetch(gateways[0]);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
          metadata = await response.json();
        } else {
          throw new Error('Unknown tokenURI format');
        }

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

  // Fetch Farcaster mood (for automatic updates when checkbox is enabled)
  const fetchFarcasterMood = useCallback(async () => {
    if (!enableFarcasterMood || !farcasterUserId || farcasterUserId.trim() === '') {
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
        const { mood, personality, postsAnalyzed, color1, color2, baseFrequency, reasoning } = await response.json();
        setFarcasterMood(mood);
        setFarcasterPersonality(personality || null);
        setPostsAnalyzed(postsAnalyzed || 0);
        setRecommendedColor1(color1 || null);
        setRecommendedColor2(color2 || null);
        setRecommendedFrequency(baseFrequency || null);
        setAiReasoning(reasoning || null);
      } else {
        console.error('Error fetching Farcaster mood:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching Farcaster mood:', error);
    }
  }, [farcasterUserId, enableFarcasterMood]);

  // Test function for the Farcaster Mood Readout card (no checkbox required)
  const testFarcasterMood = useCallback(async () => {
    if (!farcasterUserId || farcasterUserId.trim() === '') {
      alert('Please enter a username or FID');
      return;
    }
    try {
      const response = await fetch('/api/gen2/farcaster-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: farcasterUserId }),
      });

      if (response.ok) {
        const { mood, personality, postsAnalyzed, color1, color2, baseFrequency, reasoning } = await response.json();
        setFarcasterMood(mood);
        setFarcasterPersonality(personality || null);
        setPostsAnalyzed(postsAnalyzed || 0);
        setRecommendedColor1(color1 || null);
        setRecommendedColor2(color2 || null);
        setRecommendedFrequency(baseFrequency || null);
        setAiReasoning(reasoning || null);
      } else {
        const errorText = await response.text();
        console.error('Error fetching Farcaster mood:', errorText);
        alert(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching Farcaster mood:', error);
      alert(`Error: ${error}`);
    }
  }, [farcasterUserId]);

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

  // Capture canvas frames and convert to animated GIF
  const exportCanvasAsGIF = async (): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Canvas not available');
    }

    // Capture enough frames to match canvas animation speed
    // Canvas uses t = frame * 0.628
    // GIF uses t = (frame / totalFrames) * 628
    // For same speed: frame * 0.628 = (frame / totalFrames) * 628
    // So 0.628 = 628 / totalFrames → totalFrames = 628 / 0.628 = 1000
    const totalFrames = 1000; // Match canvas speed
    const size = canvas.width;

    // Create a temporary canvas to render frames
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to get context');
    }

    // Capture frames using the SAME rendering functions as the live canvas
    const frames: ImageData[] = [];
    // Add one extra frame so last frame (totalFrames) is the same as first frame (0)
    for (let frame = 0; frame <= totalFrames; frame++) {
      tempCtx.clearRect(0, 0, size, size);

      // For seamless loop: phase must complete 2π cycles
      // phase = t * 0.01 needs to reach 2π by last frame
      // So: (totalFrames/totalFrames) * multiplier * 0.01 = 2π
      // multiplier = 2π / 0.01 = 628
      const t = (frame / totalFrames) * 628;

      // Render Flow Field background - must use same time as animation
      if (enableFlowField) {
        // Use t normalized to 0-2π for angle, with direction applied
        const angle = (t / 100) * flowFieldDirection;

        const x0 = size / 2 + Math.cos(angle) * size;
        const y0 = size / 2 + Math.sin(angle) * size;
        const x1 = size / 2 - Math.cos(angle) * size;
        const y1 = size / 2 - Math.sin(angle) * size;

        const gradient = tempCtx.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, flowColor1);
        gradient.addColorStop(1, flowColor2);

        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, size, size);
      }

      // Use the EXACT same rendering functions as the live canvas
      renderFlowFields(tempCtx, size, t);
      renderContourMapping(tempCtx, size, t);

      frames.push(tempCtx.getImageData(0, 0, size, size));
    }

    // Create GIF from frames
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: size,
      height: size,
      workerScript: '/gif.worker.js',
    } as any);

    frames.forEach(frameData => {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = size;
      frameCanvas.height = size;
      const frameCtx = frameCanvas.getContext('2d');
      if (frameCtx) {
        frameCtx.putImageData(frameData, 0, 0);
        gif.addFrame(frameCanvas, { delay: 1000 / 30 }); // 30 FPS
      }
    });

    return new Promise((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });
      gif.on('error', (error: any) => {
        reject(error);
      });
      gif.render();
    });
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

    // Get the actual rendered size of the canvas
    const rect = canvas.getBoundingClientRect();
    const size = Math.floor(rect.width);
    canvas.width = size;
    canvas.height = size;

    let frame = 0;
    let animationFrame: number;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Use same time calculation as GIF for matching speed
      const t = frame * 0.628; // Same as: (frame / totalFrames) * 628 when totalFrames=100

      // Render Flow Field background - must use same time as animation
      if (enableFlowField) {
        const angle = (t / 100) * flowFieldDirection;

        const x0 = size / 2 + Math.cos(angle) * size;
        const y0 = size / 2 + Math.sin(angle) * size;
        const x1 = size / 2 - Math.cos(angle) * size;
        const y1 = size / 2 - Math.sin(angle) * size;

        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, flowColor1);
        gradient.addColorStop(1, flowColor2);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }

      renderFlowFields(ctx, size, t);
      renderContourMapping(ctx, size, t);

      frame++;
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [enableFlowField, enableFlowFields, enableContourMapping, contourAffectsFlow, flowFieldBaseFreq, flowFieldAmplitude, flowFieldOctaves, flowColor1, flowColor2, flowFieldRotation, flowFieldDirection, flowFieldsBaseFreq, flowFieldsAmplitude, flowFieldsOctaves, flowFieldsRotation, flowFieldsDirection, flowLineLength, flowLineDensity, contourBaseFreq, contourAmplitude, contourOctaves, contourLevels, contourSmoothness, enableFarcasterMood, farcasterMood]);

  useEffect(() => {
    fetchFarcasterMood();
  }, [fetchFarcasterMood]);

  // Fetch the actual mint price from the contract for current network
  useEffect(() => {
    const fetchMintPrice = async () => {
      if (!publicClient || currentChainId === null) return;

      const contractAddress = getContractAddress();
      const networkName = isMainnet ? 'MAINNET' : 'SEPOLIA';
      console.log('📡 Fetching price from:', contractAddress, 'on', networkName);

      try {
        const price: any = await publicClient.readContract({
          address: contractAddress,
          abi: gen1ABI,
          functionName: 'mintPrice',
        });
        console.log('Contract mint price:', (price as any).toString());
        setContractMintPrice(price as bigint);
      } catch (err: any) {
        console.warn('⚠️ Could not fetch price for connected network:', err.message);
        setContractMintPrice(null);
      }
    };

    fetchMintPrice();
  }, [publicClient, currentChainId, isMainnet]); // Reload when network changes

  // Remove redundant per-network effects; unified price fetch above already respects currentChainId

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
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans">
      <header className="bg-slate-800 p-4 shadow-lg border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">Gen1 NFT Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Design animated Mood Ring NFTs - Flow Field, FlowFields, and Contour Mapping</p>
          </div>
          <div className="flex items-center gap-2">
            {!isConnected ? (
              connectors.slice(0, 2).map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    console.log('Connecting with:', connector.name);
                    connect({ connector });
                  }}
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors duration-200"
                >
                  {connector.name}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-slate-700 border border-slate-600 text-cyan-300">
                  {getNetworkName()}
                </span>
                <div className="flex gap-2">
                  {currentChainId !== 8453 && (
                    <button
                      onClick={() => {
                        if (switchChain) {
                          switchChain({ chainId: 8453 });
                        }
                      }}
                      type="button"
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1 px-2 rounded border border-slate-600"
                      disabled={!switchChain}
                    >
                      Base Mainnet
                    </button>
                  )}
                  {currentChainId !== 84532 && (
                    <button
                      onClick={() => {
                        if (switchChain) {
                          switchChain({ chainId: 84532 });
                        }
                      }}
                      type="button"
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1 px-2 rounded border border-slate-600"
                      disabled={!switchChain}
                    >
                      Base Sepolia
                    </button>
                  )}
                </div>
                <button
                  onClick={() => disconnect()}
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded transition-colors duration-200"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="p-4">
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem'}}>
          {/* Canvas Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4 row-span-2">
            <h2 className="text-lg font-bold text-cyan-300 mb-3">CANVAS (Live Loop)</h2>
            <div className="bg-slate-900 rounded-lg p-2">
              <canvas ref={canvasRef} className="rounded-lg shadow-2xl w-full" style={{aspectRatio: '1/1'}} />
            </div>
          </div>

          {/* NFT Viewer Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4 row-span-2">
            <h2 className="text-lg font-bold text-cyan-300 mb-3">NFT Viewer</h2>
            <div className="bg-slate-900 rounded-lg p-4 space-y-3">
              <div>
                <label htmlFor="nft-token-id" className="block text-sm font-medium text-gray-400 mb-2">
                  Load Token ID:
                </label>
                <input
                  type="number"
                  id="nft-token-id"
                  value={tokenIdToUpdate || ''}
                  onChange={(e) => setTokenIdToUpdate(parseInt(e.target.value))}
                  min="1"
                  placeholder="Enter token ID"
                  className="w-full px-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                />
            </div>
              <button
                type="button"
                onClick={handleFetchNFTMetadata}
                disabled={!tokenIdToUpdate || isFetchingNFTMetadata}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNFTMetadata ? 'Loading...' : 'Load NFT'}
              </button>

              {currentNFTMetadata && (currentNFTMetadata.image || currentNFTMetadata.animation_url) && (
                <div className="mt-4">
                  <img
                    src={
                      currentNFTMetadata.animation_url
                        ? (currentNFTMetadata.animation_url.startsWith('ipfs://')
                            ? `https://gateway.pinata.cloud/ipfs/${currentNFTMetadata.animation_url.replace('ipfs://', '')}`
                            : currentNFTMetadata.animation_url)
                        : (currentNFTMetadata.image.startsWith('ipfs://')
                            ? `https://gateway.pinata.cloud/ipfs/${currentNFTMetadata.image.replace('ipfs://', '')}`
                            : currentNFTMetadata.image)
                    }
                    alt={`NFT #${tokenIdToUpdate}`}
                    className="w-full rounded-lg border border-slate-600"
                  />
                </div>
              )}

              {fetchNFTMetadataError && (
                <p className="text-xs text-red-400 mt-2">Error: {fetchNFTMetadataError.message}</p>
              )}
            </div>
          </div>

          {/* CARD 3: PLACEHOLDER - TBD */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <h2 className="text-lg font-bold text-cyan-300 mb-3">Card 3 - TBD</h2>
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              <p>Placeholder for future feature</p>
            </div>
          </div>

          {/* CARD 4: Contour Mapping */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-cyan-300">Contour Mapping</h2>
              <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                  checked={enableContourMapping}
                  onChange={(e) => setEnableContourMapping(e.target.checked)}
                    className="w-5 h-5 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500"
                  />
                <span className="text-gray-300 text-sm">Enabled</span>
                </label>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Base Freq: {contourBaseFreq.toFixed(3)}</label>
                <input type="range" min="0.001" max="0.05" step="0.001" value={contourBaseFreq} onChange={e => setContourBaseFreq(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Amplitude: {contourAmplitude.toFixed(2)}</label>
                <input type="range" min="0.1" max="3" step="0.1" value={contourAmplitude} onChange={e => setContourAmplitude(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Octaves: {contourOctaves}</label>
                <input type="range" min="1" max="8" step="1" value={contourOctaves} onChange={e => setContourOctaves(parseInt(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Levels: {contourLevels}</label>
                <input type="range" min="2" max="20" step="1" value={contourLevels} onChange={e => setContourLevels(parseInt(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Smoothness: {contourSmoothness.toFixed(2)}</label>
                <input type="range" min="0" max="1" step="0.05" value={contourSmoothness} onChange={e => setContourSmoothness(parseFloat(e.target.value))} className="w-full" />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-3 mt-3 border-t border-slate-600">
                  <input
                    type="checkbox"
                  checked={contourAffectsFlow}
                  onChange={(e) => setContourAffectsFlow(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500"
                />
                <span className="text-gray-300 text-sm">Contour Affects Flow Direction</span>
              </label>
            </div>
          </div>

          {/* Flow Field Parameters Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-cyan-300">Flow Field (Background)</h2>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableFlowField}
                  onChange={(e) => setEnableFlowField(e.target.checked)}
                    className="w-5 h-5 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500"
                  />
                <span className="text-gray-300 text-sm">Enabled</span>
                </label>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Color 1</label>
                  <input type="color" value={flowColor1} onChange={e => setFlowColor1(e.target.value)} className="w-full h-7 bg-slate-700 border border-slate-600 rounded cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Color 2</label>
                  <input type="color" value={flowColor2} onChange={e => setFlowColor2(e.target.value)} className="w-full h-7 bg-slate-700 border border-slate-600 rounded cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Base Freq: {flowFieldBaseFreq.toFixed(3)}</label>
                <input type="range" min="0.001" max="0.05" step="0.001" value={flowFieldBaseFreq} onChange={e => setFlowFieldBaseFreq(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Amplitude: {flowFieldAmplitude.toFixed(2)}</label>
                <input type="range" min="0.1" max="3" step="0.1" value={flowFieldAmplitude} onChange={e => setFlowFieldAmplitude(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Octaves: {flowFieldOctaves}</label>
                <input type="range" min="1" max="8" step="1" value={flowFieldOctaves} onChange={e => setFlowFieldOctaves(parseInt(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Rotation: {flowFieldRotation}°</label>
                <input type="range" min="0" max="360" step="1" value={flowFieldRotation} onChange={e => setFlowFieldRotation(parseInt(e.target.value))} className="w-full" />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400">Direction:</label>
                <select value={flowFieldDirection} onChange={e => setFlowFieldDirection(parseInt(e.target.value))} className="flex-1 text-xs bg-slate-700 text-white px-2 py-1 rounded border border-slate-600">
                  <option value="1">Clockwise</option>
                  <option value="-1">Counter-Clockwise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flow Fields (Lines) Parameters Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-cyan-300">Flow Fields (Lines)</h2>
              <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                  checked={enableFlowFields}
                  onChange={(e) => setEnableFlowFields(e.target.checked)}
                    className="w-5 h-5 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500"
                  />
                <span className="text-gray-300 text-sm">Enabled</span>
                </label>
              </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Base Freq: {flowFieldsBaseFreq.toFixed(3)}</label>
                <input type="range" min="0.001" max="0.05" step="0.001" value={flowFieldsBaseFreq} onChange={e => setFlowFieldsBaseFreq(parseFloat(e.target.value))} className="w-full" />
            </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Amplitude: {flowFieldsAmplitude.toFixed(2)}</label>
                <input type="range" min="0.1" max="3" step="0.1" value={flowFieldsAmplitude} onChange={e => setFlowFieldsAmplitude(parseFloat(e.target.value))} className="w-full" />
          </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Octaves: {flowFieldsOctaves}</label>
                <input type="range" min="1" max="8" step="1" value={flowFieldsOctaves} onChange={e => setFlowFieldsOctaves(parseInt(e.target.value))} className="w-full" />
            </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Line Length: {flowLineLength}</label>
                <input type="range" min="5" max="100" step="1" value={flowLineLength} onChange={e => setFlowLineLength(parseInt(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Density: {flowLineDensity.toFixed(2)}</label>
                <input type="range" min="0.01" max="0.5" step="0.01" value={flowLineDensity} onChange={e => setFlowLineDensity(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Rotation: {flowFieldsRotation}°</label>
                <input type="range" min="0" max="360" step="1" value={flowFieldsRotation} onChange={e => setFlowFieldsRotation(parseInt(e.target.value))} className="w-full" />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-400">Direction:</label>
                <select value={flowFieldsDirection} onChange={e => setFlowFieldsDirection(parseInt(e.target.value))} className="flex-1 text-xs bg-slate-700 text-white px-2 py-1 rounded border border-slate-600">
                  <option value="1">Clockwise</option>
                  <option value="-1">Counter-Clockwise</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 7: Data Influence Modifiers */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <h2 className="text-lg font-bold text-cyan-300 mb-3">DATA INFLUENCE MODIFIERS</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="enable-farcaster-mood"
                type="checkbox"
                checked={enableFarcasterMood}
                onChange={e => setEnableFarcasterMood(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
                  <label htmlFor="enable-farcaster-mood" className="ml-2 block text-sm text-gray-300">
                    Farcaster Mood
              </label>
            </div>
                <span className="text-xs text-green-400 font-semibold">✓ Ready</span>
                </div>

              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center">
                  <input id="enable-neighbor-associations" type="checkbox" checked={enableNeighborAssociations} onChange={e => setEnableNeighborAssociations(e.target.checked)} disabled className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-500 rounded cursor-not-allowed" />
                  <label htmlFor="enable-neighbor-associations" className="ml-2 block text-sm text-gray-500">Neighbor Associations</label>
                </div>
                <span className="text-xs text-yellow-400">Coming Soon</span>
              </div>

              <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center">
                  <input id="enable-token-transactions" type="checkbox" checked={enableTokenTransactions} onChange={e => setEnableTokenTransactions(e.target.checked)} disabled className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-500 rounded cursor-not-allowed" />
                  <label htmlFor="enable-token-transactions" className="ml-2 block text-sm text-gray-500">Token Transactions</label>
            </div>
                <span className="text-xs text-yellow-400">Coming Soon</span>
            </div>

              <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center">
                  <input id="enable-wallet-holdings" type="checkbox" checked={enableWalletHoldings} onChange={e => setEnableWalletHoldings(e.target.checked)} disabled className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-500 rounded cursor-not-allowed" />
                  <label htmlFor="enable-wallet-holdings" className="ml-2 block text-sm text-gray-500">Wallet Holdings</label>
            </div>
                <span className="text-xs text-yellow-400">Coming Soon</span>
          </div>

              <button
                onClick={handleExportSettings}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 mt-4"
              >
                📋 Export All Settings
              </button>
              <p className="text-xs text-gray-400 text-center mt-1">
                Copy all layer parameters to clipboard
              </p>
            </div>
          </div>

          {/* CARD 8: Farcaster Mood Readout - NEW */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4">
            <h2 className="text-lg font-bold text-cyan-300 mb-3">Farcaster Mood Readout</h2>
            <div className="space-y-3">
            <div>
                <label htmlFor="test-farcaster-user" className="block text-sm font-medium text-gray-400 mb-2">
                  Username or FID:
                </label>
                <input
                  type="text"
                  id="test-farcaster-user"
                  value={farcasterUserId}
                  onChange={e => setFarcasterUserId(e.target.value)}
                  placeholder="e.g., dwr or FID: 3"
                  className="w-full px-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 rounded-md bg-slate-700 text-white"
                />
            </div>

              <button
                onClick={testFarcasterMood}
                disabled={!farcasterUserId}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔍 Analyze Mood
              </button>

              {farcasterMood && (
                <div className="space-y-3">
                  <div className="bg-slate-900 p-3 rounded-md border border-slate-700 space-y-2">
            <div>
                      <p className="text-xs text-gray-400">Mood:</p>
                      <p className="text-lg font-semibold text-cyan-400">{farcasterMood}</p>
            </div>
                    {farcasterPersonality && (
            <div>
                        <p className="text-xs text-gray-400">Personality:</p>
                        <p className="text-md font-semibold text-purple-400">{farcasterPersonality}</p>
            </div>
                    )}
                    {postsAnalyzed > 0 && (
                      <p className="text-xs text-gray-500 italic">Based on {postsAnalyzed} posts</p>
                    )}
                  </div>

                  {recommendedColor1 && recommendedColor2 && (
                    <div className="bg-slate-900 p-3 rounded-md border border-slate-700">
                      <p className="text-xs text-gray-400 mb-2">AI Recommendations:</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center">
                          <div className="w-full h-8 rounded border border-slate-600" style={{backgroundColor: recommendedColor1}}></div>
                          <p className="text-xs text-gray-500 mt-1">{recommendedColor1}</p>
            </div>
                        <div className="text-center">
                          <div className="w-full h-8 rounded border border-slate-600" style={{backgroundColor: recommendedColor2}}></div>
                          <p className="text-xs text-gray-500 mt-1">{recommendedColor2}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Frequency: <span className="text-cyan-400 font-semibold">{recommendedFrequency?.toFixed(3)}</span></p>
                      {aiReasoning && (
                        <p className="text-xs text-gray-500 italic mt-2">{aiReasoning}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleApplyMoodToCanvas}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors duration-200"
                    >
                      🎨 Apply to Canvas
                    </button>
                    <button
                      onClick={handleApplyMoodToNFT}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors duration-200"
                    >
                      🖼️ Apply to NFT
                    </button>
            </div>
          </div>
              )}

              {!farcasterMood && farcasterUserId && (
                <p className="text-xs text-gray-500 italic">Click "Analyze Mood" to fetch AI analysis</p>
              )}
            </div>
          </div>

          {/* On-Chain Actions Card - Card #6 */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4 col-span-3">
              <h2 className="text-lg font-bold text-cyan-300 mb-3">ON-CHAIN ACTIONS</h2>
              <div className="space-y-3">
            {!isConnected && (
              <div className="text-center py-4">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mb-2"
                  >
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )}

            {isConnected && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Connected: <span className="font-semibold text-cyan-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span></p>

                {/* Current Network Price Display */}
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                  <h3 className="text-sm font-bold text-cyan-400 mb-2">💰 Mint Price</h3>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{getNetworkName()}</p>
                    <p className="text-lg font-semibold">
                      {contractMintPrice
                        ? `${ethers.formatEther(contractMintPrice)} ETH`
                        : currentChainId === null ? 'Connect wallet' : 'Loading...'}
                    </p>
                    {currentChainId && (
                      <p className="text-xs text-green-400 mt-1">✓ Connected</p>
                    )}
                  </div>
                  {(!currentChainId || (currentChainId !== 8453 && currentChainId !== 84532)) && (
                    <p className="text-xs text-yellow-400 mt-2 text-center">
                      ⚠️ Switch to Base Mainnet or Base Sepolia
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-600 pt-3">
                  <h3 className="text-md font-bold text-cyan-400 mb-2">Mint New NFT</h3>
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
                  onClick={async () => {
                    console.log('🎃 Mint button clicked!');

                    if (!contractMintPrice) {
                      alert('⏳ Loading mint price from contract... Please wait a few seconds and try again.');
                      return;
                    }

                    try {
                      // PLACEHOLDER IMAGE URL (shown while IPFS uploads)
                      const PLACEHOLDER_IMAGE = 'https://ipfs.io/ipfs/QmPlaceholder'; // You'll replace this with a real placeholder

                      // Create initial metadata with placeholder
                      // We'll need to generate a token ID, but since we don't have it yet,
                      // we'll use a temporary one and update it after mint
                      const tempId = Date.now();
                      const initialMetadata = {
                        name: `Gen1 #${tempId}`,
                        description: 'A generative Gen1 NFT with dynamic visual layers',
                        image: PLACEHOLDER_IMAGE,
                        animation_url: PLACEHOLDER_IMAGE,
                        attributes: [
                          {
                            trait_type: 'Iteration',
                            value: 1,
                          },
                          {
                            trait_type: 'Status',
                            value: 'Processing',
                          },
                        ],
                      };

                      // Step 1: Mint immediately with placeholder (PAYMENT HAPPENS HERE)
                      const totalValue = contractMintPrice * BigInt(mintCount);
                      const contractAddress = getContractAddress();
                      const chainId = getChainId();
                      const networkName = getNetworkName();

                      console.log('💰 Minting with placeholder (payment happening now)...');
                      console.log('📍 Network:', networkName);
                      console.log('📍 Contract:', contractAddress);
                      console.log('📍 Chain ID:', chainId);
                      console.log('Total value:', totalValue.toString(), 'wei');

                      writeContract({
                        address: contractAddress,
                        abi: gen1ABI as any,
                        functionName: 'mint',
                        args: [PLACEHOLDER_IMAGE, JSON.stringify(initialMetadata)],
                        value: totalValue,
                        chainId: chainId,
                      } as any);

                      console.log('✓ WriteContract called - Payment will be taken');

                      // Wait for transaction to be mined to get the token ID
                      // (For now, we'll need to get this from the transaction receipt)
                      // This will be handled in the useEffect that watches isConfirmed

                    } catch (err: any) {
                      console.error('Mint error:', err);
                      alert('Error: ' + err.message);
                    }
                  }}
                  disabled={!isConnected || !contractMintPrice || mintCount < 1 || mintCount > 10 || isMinting || isConfirming}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? 'Minting...' : isConfirming ? 'Confirming...' : contractMintPrice ? `🎃 Mint ${mintCount} NFT (GIF)` : 'Loading Price...'}
                </button>
                <p className="text-sm text-yellow-400">Note: Current contract ABI only supports minting to the connected wallet. 'To Address' field is for future transfer functionality or contract update.</p>
                {hash && <p className="text-sm text-gray-400">Transaction Hash: <a href={`https://sepolia.basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{hash.slice(0, 6)}...{hash.slice(-4)}</a></p>}
                {isConfirming && <p className="text-sm text-gray-400">Waiting for confirmation...</p>}
                {isConfirmed && <p className="text-sm text-green-400">Mint successful!</p>}
                {confirmError && <p className="text-sm text-red-400">Error confirming transaction: {confirmError.message}</p>}
              </div>

                <div className="border-t border-slate-600 pt-3">
                  <h3 className="text-md font-bold text-cyan-400 mb-2">Update Existing NFT</h3>
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
                  onClick={handleUpdateOnChain}
                  disabled={!tokenIdToUpdate || isUpdatingOnChain}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingOnChain ? 'Generating GIF...' : '🎨 Generate + Upload + Update NFT'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  This will capture the current canvas as an animated GIF, upload it to IPFS, and update the contract
                </p>
              </div>
                </div>

                <div className="border-t border-slate-600 pt-3">
                  <h3 className="text-md font-bold text-cyan-400 mb-2">Batch Operations</h3>
                <button
                  type="button"
                  onClick={handleRunBatchUpdateScript}
                  disabled={isBatchRunning}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50"
                >
                    {isBatchRunning ? 'Running...' : 'Run Batch Script'}
                </button>
                  <p className="text-sm text-gray-400 mt-2">Status: <span className="font-semibold text-cyan-400">{batchStatus}</span></p>
                  {lastBatchRunTimestamp && <p className="text-xs text-gray-400">Last Run: {new Date(lastBatchRunTimestamp).toLocaleString()}</p>}
              </div>
              </div>
            )}
            </div>
          </div>

          {/* Data Sources Legend Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl p-4 col-span-3">
              <h2 className="text-lg font-bold text-cyan-300 mb-3">DATA SOURCES LEGEND</h2>
              <div className="space-y-2 text-xs">
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
        </div>
      </main>
    </div>
  );
};

export default Gen1Creator;
