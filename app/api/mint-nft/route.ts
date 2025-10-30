import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid, address, imageUrl, theme } = await request.json();

    if (!fid || !imageUrl || !theme) {
      return NextResponse.json({ error: 'FID, image URL, and theme are required' }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY || '';
    const walletId = process.env.NEYNAR_WALLET_ID || '';

    if (!apiKey || !walletId) {
      return NextResponse.json(
        {
          error: 'Neynar API key and wallet ID must be configured',
          note: 'Contact Neynar to set up server wallet after deploying NFT contract'
        },
        { status: 500 }
      );
    }

    const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
    console.log('Mint route CONTRACT_ADDRESS =', nftContractAddress);
    if (!nftContractAddress) {
      return NextResponse.json({ error: 'Contract not deployed' }, { status: 400 });
    }

    if (!nftContractAddress || nftContractAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { error: 'NFT contract not deployed yet. Please deploy the contract first.' },
        { status: 400 }
      );
    }

    // Use Neynar's NFT minting API
    const response = await fetch('https://api.neynar.com/v2/farcaster/nft/mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-wallet-id': walletId,
      },
      body: JSON.stringify({
        network: 'base-sepolia', // Use 'base' for mainnet
        contract_address: nftContractAddress,
        recipients: [{
          fid: fid,
          address: address, // User's wallet address (optional but recommended)
          quantity: 1,
        }],
        async: false, // Wait for confirmation
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to mint NFT: ${response.statusText}`);
    }

    const result = await response.json();

    // Extract the transaction hash from the first transaction
    const txHash = result.transactions?.[0]?.transaction_hash;

    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      message: 'NFT minted successfully!',
      receipt: result.transactions?.[0]?.receipt,
    });
  } catch (error: any) {
    console.error('Error minting NFT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mint NFT' },
      { status: 500 }
    );
  }
}
