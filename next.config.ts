import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose Vercel's build-time env to the browser so DevPanel can detect preview vs production
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "development",
  },
};

export default nextConfig;
