/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/**',
      },
    ],
    unoptimized: false,
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.vercel.app;
              worker-src 'self' blob: https://*.clerk.accounts.dev;
              style-src 'self' 'unsafe-inline';
              img-src 'self' blob: data: https://*.clerk.accounts.dev https://img.clerk.com https://images.clerk.dev https://*.clerk.dev;
              connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.dev https://*.razorpay.com https://api.razorpay.com;
              frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  },
};

module.exports = nextConfig; 