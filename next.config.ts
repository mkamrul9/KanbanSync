import type { NextConfig } from "next";
// @ts-expect-error next-pwa lacks type definitions
import withPWAInit from "next-pwa";

const nextConfig: NextConfig = {
  // Keep Node.js-only packages out of the client/edge bundle
  serverExternalPackages: ['pg', '@prisma/client', '@auth/prisma-adapter', 'pusher'],
  turbopack: {},
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);