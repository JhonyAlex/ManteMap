import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mantemap/database', '@mantemap/shared', '@mantemap/ui', '@mantemap/validation'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
