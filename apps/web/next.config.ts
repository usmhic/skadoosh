import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@skaddosh/ui",
    "@skaddosh/db",
    "@skaddosh/auth",
    "@skaddosh/api",
    "@skaddosh/contracts",
    "@skaddosh/i18n",
  ],
  // Circles were folded into gallery mediums; keep old links working.
  async redirects() {
    const circles: Record<string, string> = {
      "short-fiction": "writing",
      poetry: "writing",
      "essays-ideas": "writing",
      "visual-art": "art",
      "music-sound": "music",
      "games-interactive": "games",
      "film-scripts": "film",
      "research-archives": "research",
    };
    return [
      { source: "/circles", destination: "/", permanent: true },
      ...Object.entries(circles).map(([slug, medium]) => ({
        source: `/circles/${slug}`,
        destination: `/?medium=${medium}`,
        permanent: true,
      })),
      { source: "/circles/:slug", destination: "/", permanent: true },
    ];
  },
};
export default config;
