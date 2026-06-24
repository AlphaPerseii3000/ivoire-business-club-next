import "./patch-readlink.js";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
  },
];

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

const remotePatterns: RemotePattern[] = [
  { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
  { protocol: "https", hostname: "*.r2.dev" },
  { protocol: "https", hostname: "*.infomaniak.com" },
  { protocol: "https", hostname: "*.swiss-backup.ch" },
  // Self-hosted article images served by Nginx from /var/www/ibc/shared/uploads/
  // Needed because Next.js standalone can't resolve the symlink at runtime
  { protocol: "https", hostname: "www.ivoire-business-club.com", pathname: "/uploads/**" },
    { protocol: "https", hostname: "ivoire-business-club.com", pathname: "/uploads/**" },
];

if (process.env.R2_PUBLIC_URL) {
  try {
    const url = new URL(process.env.R2_PUBLIC_URL);
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || "",
    });
  } catch (e) {
    console.error("Invalid R2_PUBLIC_URL in next.config.ts:", e);
  }
}

if (process.env.AWS_ENDPOINT) {
  try {
    const url = new URL(process.env.AWS_ENDPOINT);
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || "",
    });
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: `*.${url.hostname}`,
      port: url.port || "",
    });
  } catch (e) {
    console.error("Invalid AWS_ENDPOINT in next.config.ts:", e);
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns,
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;