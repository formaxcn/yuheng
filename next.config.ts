// next.config.ts  ——  2025 年最正确写法
import type { NextConfig } from 'next';

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

export default nextConfig;