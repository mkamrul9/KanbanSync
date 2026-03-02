import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Node.js-only packages out of the client/edge bundle
  serverExternalPackages: ['pg', '@prisma/client', '@auth/prisma-adapter', 'pusher'],
};

export default nextConfig;