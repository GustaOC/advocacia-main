// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Suprime os warnings de serialização de strings grandes no cache do webpack
  webpack: (config, { isServer }) => {
    config.infrastructureLogging = {
      level: 'error',
    };
    return config;
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'owrpceuduerrzfbkedie.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: wss: ws:;
            `.replace(/\s{2,}/g, " ").trim()
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;