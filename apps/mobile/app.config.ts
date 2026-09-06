import type { ExpoConfig } from "expo/config";

const expoConfig: ExpoConfig = {
  name: "skaddosh",
  slug: "skaddosh",
  version: "0.1.0",
  scheme: "skaddosh",
  icon: "./assets/brand/logo.png",
  orientation: "portrait",
  platforms: ["ios", "android"],
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.skaddosh.mobile",
  },
  android: {
    package: "com.osascloud.skadoosh",
    adaptiveIcon: {
      foregroundImage: "./assets/brand/logo.png",
      backgroundColor: "#101417",
    },
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "001bbc18-9439-4d57-8c38-8348a0a444b1",
    },
  },
};

export default expoConfig;
