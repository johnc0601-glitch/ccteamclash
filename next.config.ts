import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.113"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
