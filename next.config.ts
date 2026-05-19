import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root: path.resolve(__dirname) },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.192"],
};

export default nextConfig;
