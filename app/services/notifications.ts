/**
 * Notification Service using Neynar
 *
 * Flow:
 * 1. User enables notifications in your app
 * 2. Your webhook receives the token (stored in database)
 * 3. Call this function to send notifications
 */

import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';

const neynarConfig = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});
const client = new NeynarAPIClient(neynarConfig);

/**
 * Send a notification to users via Neynar
 * @param targetFids Array of FIDs (Farcaster IDs) to notify
 * @param title Notification title (max 32 chars)
 * @param body Notification body (max 128 chars)
 * @param targetUrl URL to open when clicked
 */
export async function sendNotification(
  targetFids: number[],
  title: string,
  body: string,
  targetUrl: string
): Promise<void> {
  const notification = {
    title: title.substring(0, 32),
    body: body.substring(0, 128),
    target_url: targetUrl,
  };

  try {
    const response = await client.publishFrameNotifications({
      targetFids,
      notification
    });

    console.log('✅ Notification sent:', response);
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    throw error;
  }
}

/**
 * Send notification when a user's NFT is minted
 */
export async function notifyNFTMinted(
  fid: number,
  tokenId: number
): Promise<void> {
  await sendNotification(
    [fid], // Target this specific user
    '🎃 Your Pumpkin is Ready!',
    `Your personality NFT has been carved! Check it out on Base.`,
    `https://bushleague.xyz/token/${tokenId}`
  );
}

/**
 * Send notification when new features are added
 */
export async function notifyNewFeature(
  targetFids: number[],
  title: string,
  body: string,
  targetUrl: string
): Promise<void> {
  await sendNotification(
    targetFids,
    title,
    body,
    targetUrl
  );
}

