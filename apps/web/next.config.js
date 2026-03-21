/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@briefli/ui', '@briefli/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
};

module.exports = nextConfig;
