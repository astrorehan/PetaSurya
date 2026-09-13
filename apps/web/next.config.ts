import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Paket workspace diimpor sebagai sumber TS; Next yang mentranspilasinya.
  transpilePackages: ["@petasurya/ui", "@petasurya/contracts"],
};

export default config;
