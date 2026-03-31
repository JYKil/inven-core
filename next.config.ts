import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // 실험적 기능
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
