import { createAuthClient } from "@skaddosh/auth/client";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { mobileConfig } from "@/config/mobile-env";

// Required for expo-auth-session / OAuth redirect
WebBrowser.maybeCompleteAuthSession();

const authClientInstance = createAuthClient({
  baseURL: mobileConfig.authBaseUrl,
  plugins: [
    expoClient({
      scheme: mobileConfig.appScheme,
      storage: SecureStore,
      cookiePrefix: "better-auth",
    }),
  ],
});

export const authClient: ReturnType<typeof createAuthClient> = authClientInstance;
export const getAuthCookie = () =>
  "getCookie" in authClientInstance && typeof authClientInstance.getCookie === "function"
    ? authClientInstance.getCookie()
    : "";
export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } = authClient;

/** Open Google OAuth in the system browser and return on the redirect URI. */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectUri = Linking.createURL("/auth/callback");
  try {
    const res = await (signIn as ReturnType<typeof createAuthClient>["signIn"]).social({
      provider: "google",
      callbackURL: redirectUri,
    });
    if ((res as { error?: { message?: string } }).error)
      return { error: (res as { error: { message?: string } }).error.message ?? "Google sign-in failed" };
    return {};
  } catch (e) {
    return { error: (e as Error).message ?? "Google sign-in failed" };
  }
}

/** Native Apple Sign-In (iOS only). */
export async function signInWithApple(): Promise<{ error?: string }> {
  const redirectUri = Linking.createURL("/auth/callback");
  try {
    const res = await (signIn as ReturnType<typeof createAuthClient>["signIn"]).social({
      provider: "apple",
      callbackURL: redirectUri,
    });
    if ((res as { error?: { message?: string } }).error)
      return { error: (res as { error: { message?: string } }).error.message ?? "Apple sign-in failed" };
    return {};
  } catch (e) {
    return { error: (e as Error).message ?? "Apple sign-in failed" };
  }
}
