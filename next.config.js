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
              default-src 'self' https://*.clerk.accounts.dev https://*.vercel.app;
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.vercel.app;
              style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev;
              img-src 'self' data: https: blob:;
              font-src 'self' https://*.clerk.accounts.dev;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'self';
              frame-src 'self' https://checkout.razorpay.com https://*.clerk.accounts.dev;
              connect-src 'self' https://api.razorpay.com https://*.clerk.accounts.dev https://*.vercel.app;
              upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  },
};

module.exports = nextConfig; 