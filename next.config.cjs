/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
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
}

module.exports = nextConfig

