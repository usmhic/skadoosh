import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@skaddosh/ui",
    "@skaddosh/db",
    "@skaddosh/auth",
    "@skaddosh/api",
    "@skaddosh/i18n",
  ],
};
export default config;
