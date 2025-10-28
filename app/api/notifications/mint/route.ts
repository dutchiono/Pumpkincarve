import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/notifications/mint
 *
 * Called when an NFT is minted to notify the admin
 */
export async function POST(request: NextRequest) {
  try {
    const { tokenId, transactionHash, minterAddress } = await request.json();

    if (!tokenId || !transactionHash || !minterAddress) {
      return NextResponse.json(
        { error: 'tokenId, transactionHash, and minterAddress are required' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('ℹ️ DISCORD_WEBHOOK_URL not set. Skipping Discord notification.');
      return NextResponse.json({
        success: true,
        message: 'Notification skipped (no webhook configured)'
      });
    }

    const message = `🎃 **New Pumpkin NFT Mint!**\n` +
      `Token ID: #${tokenId}\n` +
      `Minter: \`${minterAddress}\`\n` +
      `Transaction: https://basescan.org/tx/${transactionHash}`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Discord webhook failed:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    console.log('✅ Mint notification sent to Discord');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Notification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

