import type { NextConfig } from "next";

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

export default nextConfig;
