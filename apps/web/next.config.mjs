/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types", "@repo/utils"],
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["https://*.ngrok-free.dev"],
  turbopack: {
    root: process.cwd() + "/../..",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
