/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js NOT to bundle these packages through webpack.
  // They use native Node.js features and must be required at runtime.
  serverExternalPackages: ["pdf-parse", "mongoose"],
};

export default nextConfig;
