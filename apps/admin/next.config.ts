import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/database",
    "@repo/auth",
    "@repo/storage",
  ],
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
