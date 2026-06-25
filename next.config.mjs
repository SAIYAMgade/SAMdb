/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The engine is pure TypeScript with no Node-only deps, so it bundles
  // straight into the client. No special webpack config required.
  eslint: {
    // ESLint is run separately; don't block production builds on it.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // node_modules is a junction to another drive in this dev environment.
    // Don't resolve symlinks to their real path, or webpack tries to build a
    // cross-drive relative import and fails. (No effect on a normal install.)
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
