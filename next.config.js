/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'img.clerk.com', 'images.clerk.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
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
      }
    ],
    unoptimized: true,
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
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.dev https://*.clerk.accounts.dev https://*.razorpay.com https://checkout.razorpay.com https://*.google.com;
              worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.dev;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.dev;
              img-src 'self' blob: data: https://*.clerk.accounts.dev https://img.clerk.com https://images.clerk.dev https://*.clerk.dev https://res.cloudinary.com;
              connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.dev https://*.clerk.dev https://*.razorpay.com https://api.razorpay.com https://res.cloudinary.com;
              frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.google.com https://www.google.com;
              font-src 'self' data: https://*.clerk.dev https://fonts.gstatic.com;
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
};

module.exports = nextConfig; 