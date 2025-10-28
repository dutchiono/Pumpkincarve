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
  webpack: (config) => {
    config.module.rules.push({
      test: /app\/gen2-creator\/Gen2App\.tsx$/,
      use: 'null-loader',
    });
    return config;
  },
}

module.exports = nextConfig

