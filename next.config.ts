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

  // Cross-origin isolation enables multithreaded WASM (ONNX Runtime Web
  // SIMD threads) for dramatically faster in-browser YOLO inference.
  // "credentialless" COEP keeps same-origin assets working without CORP headers.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
