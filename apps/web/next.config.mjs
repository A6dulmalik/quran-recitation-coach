/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types", "@repo/utils"],
  allowedDevOrigins: ["https://*.ngrok-free.dev"],
  turbopack: {
    root: process.cwd() + "/../..",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
