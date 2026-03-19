import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Security: remove x-powered-by header
  poweredByHeader: false,

  // Optimize server-side packages (not bundled into serverless functions)
  serverExternalPackages: ['postgres'],

  // Optimize package imports to reduce bundle size
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-select',
    '@radix-ui/react-label',
    '@radix-ui/react-progress',
  ],

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
