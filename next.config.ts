import type { NextConfig } from "next";

const isElectronBuild = process.env.BUILD_TARGET === "electron";

const nextConfig: NextConfig = {
  ...(isElectronBuild && { output: "export", assetPrefix: "./" }),
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
