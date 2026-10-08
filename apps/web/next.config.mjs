/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types", "@repo/utils", "@repo/quran-data"],
  allowedDevOrigins: ["https://*.ngrok-free.dev"],
  turbopack: {
    root: process.cwd() + "/../..",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
