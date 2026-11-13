import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, identityVerification, user } from "@skaddosh/db";
import { protectedProcedure, router } from "../trpc";
import { applyDecision, identityProvider, startVerification, verificationEnforced } from "../lib/identity";

export const identityRouter = router({
  /** Everything onboarding and gated actions need to know about the viewer's verification. */
  status: protectedProcedure.query(async ({ ctx }) => {
    const [me] = await db
      .select({ status: user.verificationStatus, verifiedAt: user.verifiedAt, country: user.verifiedCountry })
      .from(user)
      .where(eq(user.id, ctx.session.user.id))
      .limit(1);
    const [latest] = await db
      .select({ status: identityVerification.status, createdAt: identityVerification.createdAt })
      .from(identityVerification)
      .where(eq(identityVerification.userId, ctx.session.user.id))
      .orderBy(desc(identityVerification.createdAt))
      .limit(1);
    return {
      provider: identityProvider(),
      enforced: verificationEnforced(),
      status: me?.status ?? "unverified",
      verifiedAt: me?.verifiedAt ?? null,
      country: me?.country ?? null,
      latestSession: latest ?? null,
    };
  }),

  /** Start the provider's hosted flow; the client redirects to `url`. */
  start: protectedProcedure.mutation(async ({ ctx }) => startVerification(ctx.session.user.id)),

  /** Development-only stand-in for the provider's decision webhook. */
  mockDecide: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().startsWith("mock_"),
        outcome: z.enum(["verified", "rejected"]),
        country: z.string().regex(/^[A-Z]{2}$/).default("PT"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (identityProvider() !== "mock") throw new TRPCError({ code: "FORBIDDEN" });
      const [session] = await db
        .select()
        .from(identityVerification)
        .where(
          and(
            eq(identityVerification.provider, "mock"),
            eq(identityVerification.providerSessionId, input.sessionId),
            eq(identityVerification.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      await applyDecision({
        provider: "mock",
        sessionId: input.sessionId,
        outcome: input.outcome,
        country: input.country,
        reasonCode: input.outcome === "rejected" ? "mock_decline" : null,
      });
      return { ok: true };
    }),
});
