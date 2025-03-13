/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'res.cloudinary.com',
      'images.unsplash.com',
      'lh3.googleusercontent.com',
      'img.clerk.com',
      'img.clerk.dev',
      'images.clerk.dev',
      'vercel.app',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  swcMinify: true,
  compiler: {
    removeConsole: false,
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
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.dev https://*.clerk.com https://*.razorpay.com https://checkout.razorpay.com https://*.vercel.app;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.dev https://*.clerk.com;
              img-src 'self' data: blob: https://* http://* *;
              font-src 'self' https://fonts.gstatic.com data:;
              frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com https://*.razorpay.com;
              connect-src 'self' https://*.clerk.dev https://*.clerk.com https://*.razorpay.com https://api.clerk.dev https://api.clerk.com https://* http://*;
              manifest-src 'self';
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
};

module.exports = nextConfig; 