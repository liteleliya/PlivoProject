import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Plivo SDK is CommonJS and expects a real Node environment; keep it out
  // of the bundler so it is required at runtime instead.
  serverExternalPackages: ["plivo"],
};

export default nextConfig;
