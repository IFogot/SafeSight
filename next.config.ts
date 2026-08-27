import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better dev experience
  reactStrictMode: true,

  // Optimize images
  images: {
    remotePatterns: [],
  },

  // Environment variables exposed to the browser
  env: {},

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
