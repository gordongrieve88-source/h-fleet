import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server bundle (server.js + traced node_modules) so hosts
  // with small disks (e.g. Azure App Service F1) get ~100MB, not a full
  // node_modules copy. Local `next dev`/`next start` are unaffected.
  output: "standalone",
  experimental: {
    // The daily Syncrotess allocation PDF is uploaded through a server action.
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Roster data never belongs in someone else's iframe.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS is set by nginx in production (deploy/nginx-h-fleet.conf),
          // where TLS actually terminates.
        ],
      },
    ];
  },
};

export default nextConfig;
