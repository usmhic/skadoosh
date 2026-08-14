"use client";
import { createAuthClient } from "@skaddosh/auth/client";

const authClientInstance = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
});

export const authClient: ReturnType<typeof createAuthClient> = authClientInstance;
export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } = authClient;
