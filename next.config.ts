import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ['@prisma/client'],
  // Turbopack is the default in Next.js 16
  // No webpack config needed
};

export default nextConfig;
