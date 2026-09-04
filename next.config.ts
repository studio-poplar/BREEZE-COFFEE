import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  images: {
    // Menu photos are uploaded to Vercel Blob (see api/admin/upload); its
    // public URLs live on a per-store subdomain of this host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "studio-poplar",
  project: "breeze-coffee",
  // Source map upload needs SENTRY_AUTH_TOKEN; without it this step just
  // silently no-ops, so it's fine to leave unset until/unless stack traces
  // need to resolve back to original source.
  silent: true,
});
