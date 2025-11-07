import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS || '0x9d394EAD99Acab4cF8e65cdA3c8e440fB7D27087';
const DEMO_TOKEN_ID = '1'; // The demo NFT that shows on home page

const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CACHE_DIR = join(process.cwd(), '.cache');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for demo NFT
const PLACEHOLDER_CACHE_MAX_AGE = 60; // seconds

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

type ImageCacheData = {
  buffer: string; // base64 encoded
  contentType: string;
  lastUpdate: number;
};

function createPlaceholderSvg(tokenId: string, message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#gradient)"/>
  <g fill="none" stroke="#38bdf8" stroke-width="8" opacity="0.6">
    <circle cx="256" cy="256" r="200"/>
    <circle cx="256" cy="256" r="150"/>
    <circle cx="256" cy="256" r="100"/>
  </g>
  <text x="50%" y="45%" text-anchor="middle" fill="#e2e8f0" font-size="42" font-family="Verdana, sans-serif">Gen1 NFT</text>
  <text x="50%" y="55%" text-anchor="middle" fill="#38bdf8" font-size="28" font-family="Verdana, sans-serif">#${tokenId}</text>
  <text x="50%" y="66%" text-anchor="middle" fill="#cbd5f5" font-size="20" font-family="Verdana, sans-serif">${message}</text>
</svg>`;
}

function placeholderResponse(tokenId: string, message: string, status = 200) {
  const svg = createPlaceholderSvg(tokenId, message);
  return new NextResponse(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': `public, max-age=${PLACEHOLDER_CACHE_MAX_AGE}`,
      'X-Gen1-Image-Placeholder': 'true',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId') || '1';

  const now = Date.now();
  const cacheFile = join(CACHE_DIR, `gen1-image-${tokenId}.json`);

  // Check cache for any token (but especially the demo NFT)
  if (existsSync(cacheFile)) {
    try {
      const cacheData: ImageCacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      if (cacheData.lastUpdate && (now - cacheData.lastUpdate) < CACHE_TTL) {
        const age = Math.floor((now - cacheData.lastUpdate) / 1000);
        console.log(`✅ Returning cached Gen1 #${tokenId} image (age: ${age}s)`);
        return new NextResponse(Buffer.from(cacheData.buffer, 'base64'), {
          status: 200,
          headers: {
            'Content-Type': cacheData.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (err) {
      console.error('Error reading cache:', err);
    }
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });

    // Get token URI from contract
    const tokenURI = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    console.log(`Token URI for Gen1 #${tokenId}:`, tokenURI);

    // Gen1 contract returns JSON metadata directly (not IPFS URL)
    let imageUrl = '';
    try {
      const metadata = JSON.parse(tokenURI);
      console.log('Parsed metadata:', metadata);

      // Extract animation_url first (GIF), then fall back to image
      imageUrl = metadata.animation_url || metadata.image;
      console.log('Found image URL:', imageUrl);
    } catch (parseErr) {
      // tokenURI is not JSON, might be direct IPFS URL
      console.log('Token URI is not JSON, trying as URL');

      if (tokenURI.startsWith('ipfs://') || tokenURI.startsWith('http')) {
        imageUrl = tokenURI;
      } else {
        return placeholderResponse(tokenId, 'Metadata unavailable', 200);
      }
    }

    if (!imageUrl) {
      return placeholderResponse(tokenId, 'Invalid token URI', 200);
    }

    // Fetch and proxy the image with caching
    console.log(`🔗 Fetching Gen1 image from: ${imageUrl}`);

    // Convert IPFS URLs to gateway URLs with fallbacks
    let httpUrl = imageUrl;
    let imageResponse;
    let imageBuffer;

    if (imageUrl.startsWith('ipfs://')) {
      const cid = imageUrl.replace('ipfs://', '');

      // Try multiple gateways
      const gateways = [
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`
      ];

      console.log(`📥 Trying IPFS gateways for Gen1 CID: ${cid}`);

      // Try each gateway in order
      for (const gateway of gateways) {
        try {
          console.log(`  Trying: ${gateway}`);
          imageResponse = await fetch(gateway, {
            signal: AbortSignal.timeout(5000) // 5 second timeout per gateway
          });

          if (imageResponse.ok) {
            console.log(`✅ Successfully fetched Gen1 from: ${gateway}`);
            httpUrl = gateway;
            break;
          }
        } catch (err) {
          console.log(`  Failed: ${gateway}`);
          continue;
        }
      }

      if (!imageResponse || !imageResponse.ok) {
        throw new Error(`Failed to fetch Gen1 from all IPFS gateways`);
      }
    } else {
      // Regular HTTP URL
      console.log(`📥 Fetching Gen1 from: ${httpUrl}`);
      imageResponse = await fetch(httpUrl);

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch Gen1 image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
    }

    imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/gif';

    console.log(`✅ Successfully fetched Gen1 image, content-type: ${contentType}`);

    // Cache the image for future requests
    try {
      const cacheData: ImageCacheData = {
        buffer: Buffer.from(imageBuffer).toString('base64'),
        contentType,
        lastUpdate: now,
      };
      writeFileSync(cacheFile, JSON.stringify(cacheData));
      console.log(`✅ Cached Gen1 #${tokenId} image`);
    } catch (err) {
      console.error('Error caching image:', err);
    }

    // Return the image with caching headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error fetching Gen1 image:', error);

    // If token doesn't exist, return a better error
    const message = error.message || 'Unexpected error';
    if (error.message?.includes('Token does not exist') || error.reason === 'Token does not exist') {
      return placeholderResponse(tokenId, 'Token not minted yet', 200);
    }

    return placeholderResponse(tokenId, 'Preview unavailable', 200);
  }
}


