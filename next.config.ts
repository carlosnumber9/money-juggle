import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/investments/imports/preview": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    ]
  }
};

export default nextConfig;
