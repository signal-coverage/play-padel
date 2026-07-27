import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["odonto-next"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "odonto-next/style.css": path.resolve(
        __dirname,
        "./lib/odonto-next/odontogram.css",
      ),
      "odonto-next": path.resolve(__dirname, "./lib/odonto-next/index.js"),
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "odonto-next/style.css": "./lib/odonto-next/odontogram.css",
      "odonto-next": "./lib/odonto-next/index.js",
    },
    rules: {
      "*.{tsx,jsx}": {
        loaders: [
          {
            loader: "@locator/webpack-loader",
            options: { env: "development" },
          },
        ],
      },
    },
  },
  allowedDevOrigins: [
    "192.168.100.6",
    "smartly-riverbank-phoenix.ngrok-free.dev",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
