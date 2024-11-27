/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/supernova_account_abstraction_demo' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/supernova_account_abstraction_demo/' : '',
};

export default nextConfig;