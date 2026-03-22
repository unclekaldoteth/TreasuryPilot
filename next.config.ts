import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet",
    "@tetherto/wdk-wallet-evm-erc-4337",
    "sodium-native",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
