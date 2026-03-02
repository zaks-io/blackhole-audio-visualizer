import type { NextConfig } from "next";

const isElectronBuild = process.env.BUILD_TARGET === "electron";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(isElectronBuild && { output: "export", assetPrefix: "/" }),
  // For Electron, exclude .web.ts files (web-only routes)
  // For web, include both regular and .web.ts files
  pageExtensions: isElectronBuild
    ? ["tsx", "ts", "jsx", "js"]
    : ["web.tsx", "web.ts", "tsx", "ts", "jsx", "js"],
  turbopack: {
    rules: {
      "*.glsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.vert": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.frag": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
