const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  // Shared code under ../src resolves node_modules from the repo root. When the
  // install only populated web/node_modules (e.g. Render root directory = web),
  // `stripe` must still resolve from the Next app.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      stripe: path.resolve(__dirname, 'node_modules/stripe'),
    };
    return config;
  },
};

module.exports = nextConfig;