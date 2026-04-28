/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA Configuration
  reactStrictMode: true,
  
  // Image optimization - disable in Docker to avoid sharp issues
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Trailing slash
  trailingSlash: true,
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Output configuration
  // - 'standalone' for Docker deployment (server-side rendering)
  // - 'export' for Netlify static hosting
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : 'export',
};

module.exports = nextConfig;
