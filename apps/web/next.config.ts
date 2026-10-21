import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Paket workspace diimpor sebagai sumber TS; Next yang mentranspilasinya.
  transpilePackages: ["@petasurya/ui", "@petasurya/contracts"],
  async redirects() {
    // Tautan pencarian lama `/?q=…` menuju ruang kerja peta; nilai query ikut diteruskan.
    return [{ source: "/", has: [{ type: "query", key: "q" }], destination: "/peta", permanent: false }];
  },
};

export default config;
