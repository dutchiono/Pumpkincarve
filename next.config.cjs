/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    // Allow ngrok and other dev origins for CORS
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(',')
      : [],
  },
  images: {
    domains: ['api.openai.com', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster-manifest',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "https://farcaster.xyz",
              "https://client.farcaster.xyz",
              "https://warpcast.com",
              "https://client.warpcast.com",
              "https://wrpcd.net",
              "https://*.wrpcd.net",
              "https://privy.farcaster.xyz",
              "https://privy.warpcast.com",
              "https://auth.privy.io",
              "https://*.rpc.privy.systems",
              "https://cloudflareinsights.com",
              "https://explorer-api.walletconnect.com",
              "https://walletconnect.com",
              "https://*.walletconnect.com",
              "https://*.walletconnect.org",
              "https://mainnet.base.org",
              "https://sepolia.base.org",
              "https://ipfs.io",
              "https://*.ipfs.io",
              "https://gateway.pinata.cloud",
              "https://api.pinata.cloud",
              // Daimo Pay domains (to be added when integrated)
              "https://*.daimo.com",
              // Neynar API
              "https://api.neynar.com",
              "https://*.neynar.com",
              "wss://*.walletconnect.com",
              "wss://*.walletconnect.org",
            ].join(' '),
          },
        ],
      },
    ];
  },
  // Exclude watcher directory from build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'level': 'commonjs level' }];
    return config;
  },
}

module.exports = nextConfig

