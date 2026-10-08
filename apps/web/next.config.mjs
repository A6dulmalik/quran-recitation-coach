/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the app is fully client-side (data from /quran, grading via
  // the API), so the same build can be hosted anywhere or wrapped as a mobile app.
  output: "export",
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
