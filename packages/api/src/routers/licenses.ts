import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { chainOperation, db, license, licenseOffer, project, user } from "@skaddosh/db";
import { LICENSE_TIER_INFO } from "@skaddosh/db/legal";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { explorerTxUrl } from "../lib/chain";
import { enqueueChainOp, processInBackground } from "../lib/chain-ops";
import { assertVerified } from "../lib/identity";
import { KUDOS, licensePlatformFee } from "../lib/kudos-economy";
import { debitHot, distributeProjectIncome, lockProject } from "../lib/kudos-ledger";
import { certificateCode, licenseTerms } from "../lib/licensing";

const TIERS = ["personal", "commercial", "exclusive"] as const;
type Tier = (typeof TIERS)[number];

async function exclusiveSold(projectId: string) {
  const [row] = await db
    .select({ id: license.id })
    .from(license)
    .where(and(eq(license.projectId, projectId), eq(license.tier, "exclusive"), eq(license.status, "active")))
    .limit(1);
  return Boolean(row);
}

async function ownedProject(projectId: string, userId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.creatorId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

function tierView(tier: Tier) {
  const info = LICENSE_TIER_INFO[tier];
  return { tier, label: info.label, summary: info.summary, allows: info.allows, forbids: info.forbids };
}

export const licensesRouter = router({
  /** Licence tiers on sale for a project, in display order. */
  offers: publicProcedure.input(z.object({ projectId: z.string() })).query(async ({ input }) => {
    const [offers, sold] = await Promise.all([
      db.select().from(licenseOffer).where(eq(licenseOffer.projectId, input.projectId)),
      exclusiveSold(input.projectId),
    ]);
    return {
      exclusiveSold: sold,
      platformFeePercent: KUDOS.LICENSE_PLATFORM_FEE_BPS / 100,
      offers: TIERS.flatMap((tier) => {
        const offer = offers.find((o) => o.tier === tier && o.active);
        if (!offer) return [];
        return [{ ...tierView(tier), priceKudos: offer.priceKudos }];
      }),
    };
  }),

  /** The creator's full offer list (including inactive tiers) for the studio. */
  myOffers: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await ownedProject(input.projectId, ctx.session.user.id);
    const [offers, sold] = await Promise.all([
      db.select().from(licenseOffer).where(eq(licenseOffer.projectId, input.projectId)),
      exclusiveSold(input.projectId),
    ]);
    return {
      exclusiveSold: sold,
      tiers: TIERS.map((tier) => {
        const offer = offers.find((o) => o.tier === tier);
        return { ...tierView(tier), priceKudos: offer?.priceKudos ?? null, active: offer?.active ?? false };
      }),
    };
  }),

  setOffers: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        offers: z
          .array(z.object({ tier: z.enum(TIERS), priceKudos: z.number().int().min(1).max(1_000_000), active: z.boolean() }))
          .max(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedProject(input.projectId, ctx.session.user.id);
      if (input.offers.some((o) => o.active)) await assertVerified(ctx.session.user.id, "sell licences");
      const sold = await exclusiveSold(input.projectId);
      for (const offer of input.offers) {
        const active = sold && offer.tier !== "personal" ? false : offer.active;
        await db
          .insert(licenseOffer)
          .values({ projectId: input.projectId, tier: offer.tier, priceKudos: offer.priceKudos, active })
          .onConflictDoUpdate({
            target: [licenseOffer.projectId, licenseOffer.tier],
            set: { priceKudos: offer.priceKudos, active, updatedAt: new Date() },
          });
      }
      return { ok: true, exclusiveSold: sold };
    }),

  /** The exact terms a buyer would accept, with placeholders for their certificate. */
  preview: publicProcedure
    .input(z.object({ projectId: z.string(), tier: z.enum(TIERS) }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ title: project.title, creatorName: user.name })
        .from(project)
        .innerJoin(user, eq(user.id, project.creatorId))
        .where(and(eq(project.id, input.projectId), eq(project.status, "published")))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return licenseTerms({
        tier: input.tier,
        certificateCode: "SKD-XXX-XXXX",
        workTitle: row.title,
        creatorName: row.creatorName,
        licenseeName: ctx.session?.user?.name ?? "You",
        issuedAt: new Date(),
      });
    }),

  buy: protectedProcedure
    .input(z.object({ projectId: z.string(), tier: z.enum(TIERS) }))
    .mutation(async ({ ctx, input }) => {
      const buyerId = ctx.session.user.id;
      if (input.tier !== "personal") await assertVerified(buyerId, "buy commercial rights");

      const result = await db.transaction(async (tx) => {
        const row = await lockProject(tx, input.projectId);
        if (row.status !== "published" || row.stage === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This project isn't available to license." });
        }
        if (row.creatorId === buyerId) throw new TRPCError({ code: "BAD_REQUEST", message: "You can't license your own work." });

        const [offer] = await tx
          .select()
          .from(licenseOffer)
          .where(and(eq(licenseOffer.projectId, row.id), eq(licenseOffer.tier, input.tier), eq(licenseOffer.active, true)))
          .limit(1);
        if (!offer) throw new TRPCError({ code: "BAD_REQUEST", message: "This licence isn't on sale." });
        if (input.tier !== "personal") {
          const [sold] = await tx
            .select({ id: license.id })
            .from(license)
            .where(and(eq(license.projectId, row.id), eq(license.tier, "exclusive"), eq(license.status, "active")))
            .limit(1);
          if (sold) throw new TRPCError({ code: "BAD_REQUEST", message: "Exclusive rights to this work have been sold." });
        }

        const [[creator], [buyer]] = await Promise.all([
          tx.select({ name: user.name }).from(user).where(eq(user.id, row.creatorId)).limit(1),
          tx.select({ name: user.name }).from(user).where(eq(user.id, buyerId)).limit(1),
        ]);
        const price = offer.priceKudos;
        const fee = licensePlatformFee(price);
        const code = certificateCode();
        const issuedAt = new Date();
        const terms = licenseTerms({
          tier: input.tier,
          certificateCode: code,
          workTitle: row.title,
          creatorName: creator?.name ?? "Unknown",
          licenseeName: buyer?.name ?? "Unknown",
          issuedAt,
        });

        await debitHot(tx, buyerId, price, { kind: "license_spend", projectId: row.id, counterpartyId: row.creatorId });
        // The fee stays with the platform; the rest flows through backer returns and contributor splits.
        await distributeProjectIncome(tx, row, price - fee, buyerId, "license_earn", { countAsReceived: false });

        const [issued] = await tx
          .insert(license)
          .values({
            certificateCode: code,
            projectId: row.id,
            projectTitle: row.title,
            creatorId: row.creatorId,
            creatorName: creator?.name ?? "Unknown",
            buyerId,
            licenseeName: buyer?.name ?? "Unknown",
            tier: input.tier,
            priceKudos: price,
            platformFeeKudos: fee,
            termsVersion: terms.version,
            termsHash: terms.hash,
            createdAt: issuedAt,
          })
          .returning({ id: license.id });

        if (input.tier === "exclusive") {
          await tx
            .update(licenseOffer)
            .set({ active: false, updatedAt: new Date() })
            .where(and(eq(licenseOffer.projectId, row.id), inArray(licenseOffer.tier, ["commercial", "exclusive"])));
        }

        const opId = await enqueueChainOp(tx, {
          kind: "issue_license",
          refId: issued!.id,
          userId: buyerId,
          payload: { projectId: row.id, buyerUserId: buyerId, tier: input.tier, termsHash: terms.hash },
        });
        return { code, opId };
      });

      processInBackground(result.opId);
      return { ok: true, certificateCode: result.code };
    }),

  /** Licences the viewer bought. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        certificateCode: license.certificateCode,
        projectId: license.projectId,
        projectTitle: license.projectTitle,
        creatorName: license.creatorName,
        tier: license.tier,
        priceKudos: license.priceKudos,
        status: license.status,
        createdAt: license.createdAt,
      })
      .from(license)
      .where(eq(license.buyerId, ctx.session.user.id))
      .orderBy(desc(license.createdAt));
  }),

  /** Licences sold for the viewer's projects. */
  sold: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        certificateCode: license.certificateCode,
        projectId: license.projectId,
        projectTitle: license.projectTitle,
        licenseeName: license.licenseeName,
        tier: license.tier,
        priceKudos: license.priceKudos,
        platformFeeKudos: license.platformFeeKudos,
        createdAt: license.createdAt,
      })
      .from(license)
      .where(eq(license.creatorId, ctx.session.user.id))
      .orderBy(desc(license.createdAt));
  }),

  /** Public certificate. Re-renders the terms from the stored record and checks the hash still matches. */
  certificate: publicProcedure.input(z.object({ code: z.string().max(20) })).query(async ({ input }) => {
    const [row] = await db.select().from(license).where(eq(license.certificateCode, input.code.toUpperCase())).limit(1);
    if (!row) return null;
    const terms = licenseTerms({
      tier: row.tier,
      certificateCode: row.certificateCode,
      workTitle: row.projectTitle,
      creatorName: row.creatorName,
      licenseeName: row.licenseeName,
      issuedAt: row.createdAt,
    });
    const [op] = await db
      .select({ status: chainOperation.status, txHash: chainOperation.txHash })
      .from(chainOperation)
      .where(and(eq(chainOperation.kind, "issue_license"), eq(chainOperation.refId, row.id)))
      .limit(1);
    return {
      certificateCode: row.certificateCode,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      creatorName: row.creatorName,
      licenseeName: row.licenseeName,
      tier: tierView(row.tier),
      status: row.status,
      issuedAt: row.createdAt,
      termsVersion: row.termsVersion,
      termsHash: row.termsHash,
      termsText: terms.text,
      intact: terms.hash === row.termsHash,
      attestation: op ? { status: op.status, explorerUrl: explorerTxUrl(op.txHash) } : null,
    };
  }),
});
