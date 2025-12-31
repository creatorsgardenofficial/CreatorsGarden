import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopackの設定（空のオブジェクトでTurbopackを有効化しつつ、webpack設定との競合を回避）
  turbopack: {},
  // Webpackを使用（Turbopackが有効な場合は無視されるが、--webpackフラグで使用可能）
  webpack: (config, { isServer }) => {
    // Windowsでのsymlink問題を回避
    if (process.platform === 'win32') {
      config.resolve.symlinks = false;
    }
    return config;
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
            value: 'max-age=63072000; includeSubDomains; preload'
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
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
