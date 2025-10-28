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
  // Temporarily exclude Gen2 files from build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /Gen2App\.tsx$/,
      use: 'ignore-loader',
    });
    return config;
  },
}

module.exports = nextConfig

