import { Platform } from "react-native";

const mobileEnv = {
  /**
   * React Native/Expo runtime code does not read the root .env the same way the
   * web and server packages do, so mobile-facing values live here explicitly.
   *
   * Use `localNetworkHost` for a physical device on the same Wi-Fi network.
   */
  localWebUrl: "http://localhost:3000",
  androidEmulatorWebUrl: "http://10.0.2.2:3000",
  localNetworkWebUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://skadoosh.osas.cloud",
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "skaddosh",
  requestTimeoutMs: 30000,
} as const;

function normalizeUrl(value: string, fallback: string) {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

const configuredBaseUrl =
  mobileEnv.localNetworkWebUrl ||
  (Platform.OS === "android" ? mobileEnv.androidEmulatorWebUrl : mobileEnv.localWebUrl);

const apiBaseUrl = normalizeUrl(configuredBaseUrl, mobileEnv.localWebUrl);

export const mobileConfig = {
  apiBaseUrl,
  appScheme: mobileEnv.appScheme,
  requestTimeoutMs: mobileEnv.requestTimeoutMs,
  authBaseUrl: `${apiBaseUrl}/api/auth`,
  trpcUrl: `${apiBaseUrl}/api/trpc`,
  uploadsUrl: `${apiBaseUrl}/api/uploads/images`,
  billingPortalUrl: `${apiBaseUrl}/api/billing/portal`,
  kudosCheckoutUrl: `${apiBaseUrl}/api/billing/kudos/checkout`,
  aiSearchUrl: `${apiBaseUrl}/api/ai-search`,
} as const;
