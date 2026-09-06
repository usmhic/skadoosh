/**
 * @skaddosh/auth/server
 * Import ONLY in server-side code (API routes, server components, middleware).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { db, user, session, account, verification } from "@skaddosh/db";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mailer";

const configuredSecret = process.env.BETTER_AUTH_SECRET;
const isBetterAuthDefaultSecret = configuredSecret === "better-auth-secret-12345678901234567890";
const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const buildPlaceholder = ["build", "only", "placeholder", "not", "a", "credential"].join("-");
const authSecret = configuredSecret && !isBetterAuthDefaultSecret
  ? configuredSecret
  : (isNextBuildPhase ? buildPlaceholder : configuredSecret);

export const auth = betterAuth({
  secret: authSecret,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),

  plugins: [expo()],

  emailAndPassword: {
    enabled:                  true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, name: user.name, url });
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },

  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    apple: {
      clientId:     process.env.APPLE_CLIENT_ID     ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
    },
  },

  // Expose app-specific user fields
  user: {
    additionalFields: {
      role:     { type: "string", defaultValue: "reader", input: true },
      username: { type: "string", required: false,        input: true },
      bio:      { type: "string", required: false,        input: false },
    },
  },

  session: {
    expiresIn:   60 * 60 * 24 * 30,  // 30 days
    updateAge:   60 * 60 * 24,        // refresh daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL     ?? "https://skadoosh.osas.cloud",
    process.env.NEXT_PUBLIC_APP_URL ?? "https://skadoosh.osas.cloud",
    process.env.MOBILE_APP_API_URL  ?? "https://skadoosh.osas.cloud",
    process.env.MOBILE_APP_SCHEME
      ? `${process.env.MOBILE_APP_SCHEME}://`
      : "skaddosh://",
  ].filter((v): v is string => Boolean(v)),
});

export type Session  = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
