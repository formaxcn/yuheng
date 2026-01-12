import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',

  // 一行代码开启 React Compiler（全功能默认最优配置）
  reactCompiler: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default withNextIntl(nextConfig);