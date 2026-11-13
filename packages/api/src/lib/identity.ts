/**
 * Identity verification (docs/IDENTITY.md).
 *
 * Providers host the document and selfie capture. skaddosh only ever stores the outcome:
 * status, issuing country of the document, the provider session id, a reason code, and
 * timestamps. Names, dates of birth, document numbers, and images are never requested from the
 * provider's API or persisted.
 *
 * Providers:
 *   veriff — production default (IDENTITY_PROVIDER=veriff, VERIFF_API_KEY, VERIFF_SHARED_SECRET,
 *            VERIFF_BASE_URL). Decisions arrive by HMAC-signed webhook.
 *   mock   — development only. Refused when NODE_ENV=production.
 * With no provider configured, verification is not enforced and the UI hides it.
 */
import { createHmac, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { db, identityVerification, user } from "@skaddosh/db";
import { secureCompare } from "./secure-compare";

export type IdentityProviderName = "veriff" | "mock";
export type VerificationOutcome = "verified" | "rejected" | "resubmission" | "expired" | "abandoned" | "pending";

let warned = false;

export function identityProvider(): IdentityProviderName | null {
  const name = process.env.IDENTITY_PROVIDER;
  if (name === "veriff") {
    if (process.env.VERIFF_API_KEY && process.env.VERIFF_SHARED_SECRET && process.env.VERIFF_BASE_URL) return "veriff";
    warnOnce("IDENTITY_PROVIDER=veriff but VERIFF_API_KEY, VERIFF_SHARED_SECRET, or VERIFF_BASE_URL is missing.");
    return null;
  }
  if (name === "mock") {
    if (process.env.NODE_ENV === "production") {
      warnOnce("IDENTITY_PROVIDER=mock is refused in production. Verification is disabled.");
      return null;
    }
    return "mock";
  }
  return null;
}

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.warn(`[skaddosh] ${message}`);
}

/** Verification gates only apply when a real (or dev mock) provider is configured. */
export function verificationEnforced(): boolean {
  return identityProvider() !== null;
}

/** Throw PRECONDITION_FAILED unless the user is verified (when verification is enforced). */
export async function assertVerified(userId: string, action: string) {
  if (!verificationEnforced()) return;
  const [row] = await db
    .select({ status: user.verificationStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (row?.status !== "verified") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Verify your identity to ${action}. It takes about two minutes.`,
    });
  }
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Start a verification session and return the URL of the provider's hosted flow. */
export async function startVerification(userId: string): Promise<{ url: string; sessionId: string }> {
  const provider = identityProvider();
  if (!provider) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Identity verification isn't configured." });

  const [me] = await db.select({ status: user.verificationStatus }).from(user).where(eq(user.id, userId)).limit(1);
  if (me?.status === "verified") throw new TRPCError({ code: "BAD_REQUEST", message: "You're already verified." });

  let sessionId: string;
  let url: string;
  if (provider === "veriff") {
    const response = await fetch(`${process.env.VERIFF_BASE_URL!.replace(/\/$/, "")}/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AUTH-CLIENT": process.env.VERIFF_API_KEY! },
      body: JSON.stringify({
        verification: {
          callback: `${appUrl()}/welcome?step=verify&returned=1`,
          // An opaque id, so Veriff never receives our account ids or e-mail addresses.
          vendorData: randomUUID(),
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[skaddosh] Veriff session failed", response.status, await response.text());
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Couldn't start verification. Please try again." });
    }
    const payload = (await response.json()) as { verification?: { id?: string; url?: string } };
    if (!payload.verification?.id || !payload.verification.url) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "The verification provider returned an unexpected response." });
    }
    sessionId = payload.verification.id;
    url = payload.verification.url;
  } else {
    sessionId = `mock_${randomUUID()}`;
    url = `${appUrl()}/welcome/verify-mock?session=${encodeURIComponent(sessionId)}`;
  }

  await db.insert(identityVerification).values({ userId, provider, providerSessionId: sessionId, status: "pending" });
  await db
    .update(user)
    .set({ verificationStatus: "pending", updatedAt: new Date() })
    .where(and(eq(user.id, userId), ne(user.verificationStatus, "verified")));
  return { url, sessionId };
}

/** Constant-time check of Veriff's X-HMAC-SIGNATURE (hex HMAC-SHA256 of the raw body). */
export function verifyVeriffSignature(rawBody: string, signature: string | null, authClient: string | null): boolean {
  const secret = process.env.VERIFF_SHARED_SECRET;
  if (!secret || !signature) return false;
  if (process.env.VERIFF_API_KEY && authClient && authClient !== process.env.VERIFF_API_KEY) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return secureCompare(expected, signature.trim().toLowerCase());
}

const VERIFF_STATUS: Record<string, VerificationOutcome> = {
  approved: "verified",
  declined: "rejected",
  resubmission_requested: "resubmission",
  expired: "expired",
  abandoned: "abandoned",
  review: "pending",
};

/** Extract only what we keep from a Veriff decision webhook. Everything else is discarded. */
export function parseVeriffDecision(body: unknown): {
  sessionId: string;
  outcome: VerificationOutcome;
  country: string | null;
  reasonCode: string | null;
} | null {
  const v = (body as { verification?: Record<string, unknown> } | null)?.verification;
  if (!v || typeof v.id !== "string" || typeof v.status !== "string") return null;
  const document = v.document as { country?: unknown } | undefined;
  const country = typeof document?.country === "string" && /^[A-Za-z]{2}$/.test(document.country)
    ? document.country.toUpperCase()
    : null;
  const reasonCode = v.reasonCode != null ? String(v.reasonCode) : null;
  return { sessionId: v.id, outcome: VERIFF_STATUS[v.status] ?? "pending", country, reasonCode };
}

/** Record a decision (idempotent) and update the user's summary status. */
export async function applyDecision(input: {
  provider: IdentityProviderName;
  sessionId: string;
  outcome: VerificationOutcome;
  country: string | null;
  reasonCode: string | null;
}) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .update(identityVerification)
      .set({
        status: input.outcome,
        country: input.country,
        reasonCode: input.reasonCode,
        decidedAt: input.outcome === "pending" ? null : new Date(),
      })
      .where(and(eq(identityVerification.provider, input.provider), eq(identityVerification.providerSessionId, input.sessionId)))
      .returning();
    if (!session) return { matched: false as const };

    const [current] = await tx.select({ status: user.verificationStatus }).from(user).where(eq(user.id, session.userId)).limit(1);
    if (input.outcome === "verified") {
      await tx
        .update(user)
        .set({ verificationStatus: "verified", verifiedAt: new Date(), verifiedCountry: input.country, updatedAt: new Date() })
        .where(eq(user.id, session.userId));
    } else if (current?.status !== "verified" && input.outcome !== "pending") {
      await tx
        .update(user)
        .set({ verificationStatus: input.outcome === "rejected" ? "rejected" : "unverified", updatedAt: new Date() })
        .where(eq(user.id, session.userId));
    }
    return { matched: true as const, userId: session.userId };
  });
}
