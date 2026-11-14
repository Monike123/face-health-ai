import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  async rewrites() {
    // On Vercel, vercel.json routes /api/v1/* to the Python service; locally uvicorn runs on :8000.
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/v1/:path*", destination: "http://127.0.0.1:8000/api/v1/:path*" }]
      : [];
  },
};

export default nextConfig;
