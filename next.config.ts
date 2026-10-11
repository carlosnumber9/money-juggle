import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdfjs-dist",
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp"
  ],
  outputFileTracingIncludes: {
    "/api/category-rules/discover": [
      "./.server-models/MiniLM/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*"
    ],
    "/api/investments/imports/preview": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/@napi-rs/canvas*/**/*"
    ]
  },
  outputFileTracingExcludes: {
    "/api/category-rules/discover": [
      "./node_modules/onnxruntime-node/bin/napi-v3/darwin/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v3/win32/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
      "./node_modules/@img/*darwin*/**/*"
    ]
  }
};

export default nextConfig;
