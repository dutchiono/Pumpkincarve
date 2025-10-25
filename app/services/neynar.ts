// Neynar API service for fetching Farcaster user data
// Using official @neynar/nodejs-sdk

import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

export class NeynarService {
  private client: NeynarAPIClient;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

    if (!apiKey) {
      console.warn('NEYNAR_API_KEY not found. You need to get one from https://neynar.com/');
    }

    const config = new Configuration({
      apiKey: apiKey,
    });

    this.client = new NeynarAPIClient(config);
  }

  async getUserData(address: string): Promise<{
    posts: any[];
    pfp: string;
    username: string;
  }> {
    try {
      // Get user by address to get their FID
      const response = await this.client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });

      // The API returns users keyed by address
      const users = response[address];
      if (!users || users.length === 0) {
        throw new Error('No Farcaster account found for this address');
      }

      const user = users[0];
      const fid = user.fid;

      if (!fid) {
        throw new Error('No Farcaster account found for this address');
      }

      // Fetch user's casts
      const posts = await this.getUserPosts(fid, 100);

      return {
        posts,
        pfp: user.pfp_url || '',
        username: user.username || '',
      };
    } catch (error) {
      console.error('Error fetching user data from Neynar:', error);
      throw error;
    }
  }

  async getUserPosts(fid: number, limit: number = 100): Promise<any[]> {
    try {
      // Fetch user's casts from Neynar
      const response = await this.client.fetchCastsForUser({ fid: fid, limit: limit });

      // Format posts for AI analysis
      return response.casts.map((cast: any) => ({
        text: cast.text || '',
        hash: cast.hash,
        timestamp: cast.timestamp,
        likes: cast.reactions?.likes?.length || 0,
        recasts: cast.reactions?.recasts?.length || 0,
      }));
    } catch (error) {
      console.error('Error fetching posts from Neynar:', error);
      throw error;
    }
  }
}
