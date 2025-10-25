'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { useAccount, useBalance, useConnect, useDisconnect, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { base, baseSepolia, mainnet } from 'wagmi/chains';

// Declare ethereum property on Window
declare global {
  interface Window {
    ethereum?: any;
  }
}

// NFT Contract ABI
const PUMPKIN_NFT_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'imageUrl', type: 'string' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export default function AdminDashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: baseSepoliaBalance } = useBalance({ address, chainId: baseSepolia.id });
  const { data: baseBalance } = useBalance({ address, chainId: base.id });
  const { data: mainnetBalance } = useBalance({ address, chainId: mainnet.id });
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [deploying, setDeploying] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentIpfsUrl, setCurrentIpfsUrl] = useState<string>('');
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    setMounted(true);
    console.log('🔌 Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
    console.log('🔗 Current connection status:', { isConnected, address, chain: chain?.name });
    console.log('🔍 writeContract function:', typeof writeContract);
    console.log('🔍 isPending:', isPending);
    console.log('🔍 isConfirming:', isConfirming);
    console.log('🔍 Farcaster environment check:', typeof window !== 'undefined' ? (window as any).farcaster : 'not in browser');
  }, [connectors, isConnected, address, chain, writeContract, isPending, isConfirming]);

  useEffect(() => {
    const saved = localStorage.getItem('deployedContracts');
    if (saved) {
      setDeployedContracts(JSON.parse(saved));
    }
  }, []);

  const handleShareToFarcaster = async () => {
    if (!isConfirmed || !hash) {
      setAdminMessage({ type: 'error', text: 'No successful mint to share yet!' });
      return;
    }

    try {
      const result = await sdk.actions.composeCast({
        text: `🎃 Just minted my personalized Pumpkin NFT on Base!`,
        embeds: [currentIpfsUrl],
      });

      if (result?.cast) {
        setAdminMessage({ type: 'success', text: '🎉 Cast posted to Farcaster!' });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: 'Failed to share: ' + (err.message || String(err)) });
    }
  };

  // Show success/error messages
  useEffect(() => {
    if (isConfirmed && hash) {
      setAdminMessage({ type: 'success', text: `🎃 NFT Minted!\nTransaction: ${hash}\nIPFS: ${currentIpfsUrl}\n\nClick "Share on Farcaster" to make it viral! 🚀` });
    }
    if (error) {
      setAdminMessage({ type: 'error', text: 'Mint failed: ' + (error.message || String(error)) });
    }
  }, [isConfirmed, hash, error, currentIpfsUrl]);

  const handleDeploy = async () => {
    setAdminMessage({
      type: 'info',
      text: '💡 Deployment via browser UI is coming soon!\n\nUse Hardhat CLI instead:\nnpx hardhat run scripts/deploy.cjs --network base-sepolia'
    });
  };

  const handleConnectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      setAdminMessage({ type: 'error', text: 'No wallet connectors available' });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setAdminMessage({ type: 'info', text: 'Disconnected (may auto-reconnect in Farcaster client)' });
  };

  const addContractAddress = () => {
    if (contractAddress && !deployedContracts.includes(contractAddress)) {
      const updated = [...deployedContracts, contractAddress];
      setDeployedContracts(updated);
      localStorage.setItem('deployedContracts', JSON.stringify(updated));
      setContractAddress('');
    }
  };

  const handleTestMint = async () => {
    console.log('🔴 handleTestMint called');
    console.log('🔍 isConnected:', isConnected);
    console.log('🔍 address:', address);
    console.log('🔍 chain:', chain);
    console.log('🔍 connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

    if (!isConnected || !address) {
      console.log('❌ Not connected');
      setAdminMessage({ type: 'error', text: 'Wallet not connected. Please connect in Farcaster.' });
      return;
    }

    if (!nftContractAddress || nftContractAddress === '0x0000000000000000000000000000000000000000') {
      setAdminMessage({ type: 'error', text: 'NFT contract not deployed. Deploy first!' });
      return;
    }

    console.log('✅ Wallet connected, starting mint...');
    setDeploying(true);
    setAdminMessage({ type: 'info', text: 'Starting mint...' });

    try {
      const testImageUrl = `${window.location.origin}/test-pumpkin.png`;
      console.log('📤 Uploading to IPFS:', testImageUrl);

      const uploadResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: testImageUrl }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const { ipfsUrl } = await uploadResponse.json();
      setCurrentIpfsUrl(ipfsUrl);
      console.log('✅ IPFS URL:', ipfsUrl);
      setAdminMessage({ type: 'info', text: `Uploaded to IPFS. Sending transaction...` });

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

      setAdminMessage({ type: 'info', text: 'Transaction sent. Check your wallet to sign...' });
      console.log('✅ writeContract called');

    } catch (error: any) {
      console.error('❌ Test mint error:', error);
      console.error('❌ Error details:', { message: error.message, code: error.code, stack: error.stack });

      if (error.code === 4001) {
        setAdminMessage({ type: 'error', text: 'Transaction rejected by user' });
      } else {
        setAdminMessage({ type: 'error', text: 'Mint failed: ' + (error.message || String(error)) });
      }
    } finally {
      setDeploying(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎃</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🎃 Admin Dashboard</h1>
          <p className="text-gray-400">Deploy and manage your NFT contract</p>
        </div>

        {adminMessage && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            adminMessage.type === 'success' ? 'bg-green-500/20 border-green-500' :
            adminMessage.type === 'error' ? 'bg-red-500/20 border-red-500' :
            'bg-blue-500/20 border-blue-500'
          }`}>
            <p className="font-bold whitespace-pre-wrap">{adminMessage.text}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Wallet Connection</h2>
          {isConnected && address ? (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <p className="text-sm text-gray-400">Connected Wallet</p>
                <p className="font-mono text-lg break-all">{address}</p>
              </div>
              {balance && (
                <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Current Chain ({chain?.name || 'Unknown'})</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </p>
                </div>
              )}
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-3">Balances Across Chains</p>
                <div className="space-y-2">
                  {baseSepoliaBalance && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Base Sepolia:</span>
                      <span className="font-mono text-sm">
                        {parseFloat(baseSepoliaBalance.formatted).toFixed(4)} {baseSepoliaBalance.symbol}
                      </span>
                    </div>
                  )}
                  {baseBalance && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Base:</span>
                      <span className="font-mono text-sm">
                        {parseFloat(baseBalance.formatted).toFixed(4)} {baseBalance.symbol}
                      </span>
                    </div>
                  )}
                  {mainnetBalance && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Ethereum:</span>
                      <span className="font-mono text-sm">
                        {parseFloat(mainnetBalance.formatted).toFixed(4)} {mainnetBalance.symbol}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400">Connect your wallet to deploy contracts</p>
              <button
                onClick={handleConnectWallet}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Contract Deployment</h2>
          {isConnected ? (
            <div className="space-y-4">
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
                <p className="font-bold mb-2">⚠️ Deployment Instructions</p>
                <p className="text-sm mb-4">Contract deployment must be done via Hardhat CLI for security:</p>
                <code className="block bg-black p-3 rounded mb-2">
                  npx hardhat run scripts/deploy.cjs --network base-sepolia
                </code>
                <p className="text-xs text-gray-400">
                  After deployment, update NEXT_PUBLIC_NFT_CONTRACT_ADDRESS in your .env file
                </p>
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition"
              >
                {deploying ? 'Deploying...' : 'Show Deployment Instructions'}
              </button>
            </div>
          ) : (
            <p className="text-gray-400">Connect your wallet to deploy contracts</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🧪 Test Mint</h2>
          {isConnected ? (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <p className="font-bold mb-2">Test with Local Image</p>
                <p className="text-sm text-gray-300 mb-4">
                  Test the minting flow without generating AI images. Uses a local pumpkin image.
                </p>
                                                  <div className="flex justify-center mb-4 w-full overflow-hidden">
                   <img
                     src="/test-pumpkin.png"
                     alt="Test Pumpkin"
                     className="max-w-full h-auto object-contain rounded-lg block"
                     style={{ maxWidth: '100%', maxHeight: '60vh' }}
                   />
                 </div>
                <button
                  onClick={handleTestMint}
                  disabled={deploying || isPending || isConfirming}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition font-bold"
                >
                  {deploying || isPending || isConfirming ? '⏳ Processing...' : '🧪 Test Mint NFT'}
                </button>
                {isConfirmed && hash && (
                  <button
                    onClick={handleShareToFarcaster}
                    className="w-full mt-3 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition font-bold"
                  >
                    🚀 Share on Farcaster
                  </button>
                )}
                {hash && (
                  <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
                    <p className="text-sm font-bold text-blue-400">Transaction Hash:</p>
                    <p className="text-xs font-mono break-all">{hash}</p>
                    {isConfirming && <p className="text-xs text-blue-400 mt-2">⏳ Waiting for confirmation...</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Connect your wallet to test minting</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Environment Variables</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">NEXT_PUBLIC_NFT_CONTRACT_ADDRESS</label>
              <code className="block bg-black p-3 rounded text-sm">
                {process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || 'Not set'}
              </code>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Chain</label>
              <code className="block bg-black p-3 rounded text-sm">Base Sepolia (Testnet)</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
