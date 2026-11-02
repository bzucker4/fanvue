import type { NextConfig } from "next";

const publicHost = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).host : undefined;
const trustedOrigins = publicHost ? [publicHost] : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Cloudflare quick tunnels and the dev server must agree on the public host.
  allowedDevOrigins: trustedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: trustedOrigins,
    },
  },
};

export default nextConfig;
