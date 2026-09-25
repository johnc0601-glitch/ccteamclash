import type { NextConfig } from "next";

const isAppSurface = process.env.NEXT_PUBLIC_APP_SURFACE === "true";

const nextConfig: NextConfig = {
  async headers() {
    return [
      ...(isAppSurface
        ? [{
            source: "/:path*",
            headers: [{
              key: "X-Robots-Tag",
              value: "noindex, nofollow",
            }],
          }]
        : []),
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ["192.168.68.113"],
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iwyssbrekhwkjnlagxzc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
