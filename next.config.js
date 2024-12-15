/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.fs = false;
    config.resolve.alias.path = false;
    config.resolve.alias.canvas = false;
    // Ensure PDF.js worker is available
    config.resolve.alias['pdfjs-dist/build/pdf.worker.min'] = 'pdfjs-dist/build/pdf.worker.min.js';
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });
    return config;
  },
  images: {
    domains: [],
    remotePatterns: [],
    dangerouslyAllowSVG: true,
    unoptimized: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
