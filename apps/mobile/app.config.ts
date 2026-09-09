import type { ExpoConfig } from "expo/config";

// CI supplies a monotonic build number (the GitHub Actions run number) so every
// uploaded binary carries a distinct android.versionCode / ios.buildNumber.
// Because the config is code, CI can set it through the environment instead of
// rewriting a file and reverting it afterwards.
const buildNumber = Number(
  process.env.MOBILE_BUILD_NUMBER ?? process.env.GITHUB_RUN_NUMBER ?? 1,
);

const expoConfig: ExpoConfig = {
  name: "skaddosh",
  slug: "skaddosh",
  version: "0.1.0",
  scheme: "skaddosh",
  // The store icon is a square, opaque source image. Keep the Android
  // foreground separate: adaptive icons need a transparent, padded layer or
  // Android will crop the artwork behind device-specific masks.
  icon: "./assets/brand/app-icon.png",
  orientation: "portrait",
  platforms: ["ios", "android"],
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.skaddosh.mobile",
    buildNumber: String(buildNumber),
  },
  android: {
    package: "com.osascloud.skadoosh",
    versionCode: buildNumber,
    adaptiveIcon: {
      foregroundImage: "./assets/brand/adaptive-icon-foreground.png",
      backgroundColor: "#918781",
    },
  },
  splash: {
    image: "./assets/brand/app-icon.png",
    resizeMode: "contain",
    backgroundColor: "#918781",
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "001bbc18-9439-4d57-8c38-8348a0a444b1",
    },
  },
};

export default expoConfig;
