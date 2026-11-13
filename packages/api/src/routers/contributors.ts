import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { chainOperation, db, project, projectContributor, user } from "@skaddosh/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { explorerTxUrl } from "../lib/chain";
import { enqueueChainOp, processInBackground } from "../lib/chain-ops";
import { verificationEnforced } from "../lib/identity";
import { KUDOS, splitFits } from "../lib/kudos-economy";
import { contributorAgreement } from "../lib/licensing";

const termsSchema = z.object({
  role: z.string().trim().min(1).max(80),
  contribution: z.string().trim().max(600).default(""),
  splitBps: z.number().int().min(0).max(KUDOS.MAX_CONTRIBUTOR_SPLIT_BPS),
  coOwner: z.boolean().default(false),
});

async function acceptedSplits(projectId: string, excludeId?: string) {
  const rows = await db
    .select({ id: projectContributor.id, splitBps: projectContributor.splitBps })
    .from(projectContributor)
    .where(and(eq(projectContributor.projectId, projectId), eq(projectContributor.status, "accepted")));
  return rows.filter((r) => r.id !== excludeId).map((r) => r.splitBps);
}

async function agreementFor(projectId: string, contributorId: string, terms: z.infer<typeof termsSchema>) {
  const [row] = await db
    .select({ title: project.title, creatorId: project.creatorId, creatorName: user.name })
    .from(project)
    .innerJoin(user, eq(user.id, project.creatorId))
    .where(eq(project.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  const [contributor] = await db.select({ name: user.name }).from(user).where(eq(user.id, contributorId)).limit(1);
  if (!contributor) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found." });
  return {
    project: row,
    agreement: contributorAgreement({
      projectTitle: row.title,
      creatorName: row.creatorName,
      contributorName: contributor.name,
      role: terms.role,
      contribution: terms.contribution,
      splitBps: terms.splitBps,
      coOwner: terms.coOwner,
    }),
  };
}

export const contributorsRouter = router({
  /** Accepted contributors (public), plus pending entries the viewer is part of. */
  list: publicProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const viewerId = ctx.session?.user?.id;
    const [owner] = await db.select({ creatorId: project.creatorId }).from(project).where(eq(project.id, input.projectId)).limit(1);
    if (!owner) return { contributors: [], pending: [], creatorKeepsBps: 10_000 };
    const isOwner = owner.creatorId === viewerId;

    const rows = await db
      .select({
        c: projectContributor,
        person: {
          name: user.name,
          username: user.username,
          image: user.image,
          verified: user.verificationStatus,
        },
      })
      .from(projectContributor)
      .innerJoin(user, eq(user.id, projectContributor.userId))
      .where(and(eq(projectContributor.projectId, input.projectId), inArray(projectContributor.status, ["accepted", "invited", "requested"])))
      .orderBy(projectContributor.createdAt);
    const ops = await db
      .select({ refId: chainOperation.refId, status: chainOperation.status, txHash: chainOperation.txHash })
      .from(chainOperation)
      .where(and(eq(chainOperation.kind, "record_contribution"), inArray(chainOperation.refId, rows.map((r) => r.c.id).concat("_"))));

    const view = (r: (typeof rows)[number]) => {
      const op = ops.find((o) => o.refId === r.c.id);
      return {
        id: r.c.id,
        role: r.c.role,
        contribution: r.c.contribution,
        splitBps: r.c.splitBps,
        coOwner: r.c.coOwner,
        status: r.c.status,
        initiatedBy: r.c.initiatedBy,
        acceptedAt: r.c.acceptedAt,
        agreementHash: r.c.agreementHash,
        person: { ...r.person, verified: r.person.verified === "verified" },
        isViewer: r.c.userId === viewerId,
        attestation: op ? { status: op.status, explorerUrl: explorerTxUrl(op.txHash) } : null,
      };
    };
    const accepted = rows.filter((r) => r.c.status === "accepted");
    return {
      contributors: accepted.map(view),
      pending: rows.filter((r) => r.c.status !== "accepted" && (isOwner || r.c.userId === viewerId)).map(view),
      creatorKeepsBps: 10_000 - accepted.reduce((sum, r) => sum + r.c.splitBps, 0),
    };
  }),

  /** Creator invites someone, with the terms they're offering. */
  invite: protectedProcedure
    .input(termsSchema.extend({ projectId: z.string(), username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.select().from(project).where(eq(project.id, input.projectId)).limit(1);
      if (!row || row.creatorId !== ctx.session.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const [target] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username.replace(/^@/, "").toLowerCase()))
        .limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Nobody with that username." });
      if (target.id === row.creatorId) throw new TRPCError({ code: "BAD_REQUEST", message: "You're already the creator." });
      if (!splitFits(await acceptedSplits(row.id), input.splitBps)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contributor splits can't exceed 90% in total." });
      }
      return upsertProposal(row.id, target.id, "creator", input);
    }),

  /** Someone proposes their own contribution to a project; the creator decides. */
  request: protectedProcedure
    .input(termsSchema.extend({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(project)
        .where(and(eq(project.id, input.projectId), eq(project.status, "published")))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.creatorId === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "This is your project." });
      return upsertProposal(row.id, ctx.session.user.id, "contributor", input);
    }),

  /** The counterparty accepts or declines. Acceptance is the moment both parties have consented. */
  respond: protectedProcedure
    .input(z.object({ id: z.string(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const viewerId = ctx.session.user.id;
      const [row] = await db
        .select({ c: projectContributor, creatorId: project.creatorId })
        .from(projectContributor)
        .innerJoin(project, eq(project.id, projectContributor.projectId))
        .where(eq(projectContributor.id, input.id))
        .limit(1);
      if (!row || !["invited", "requested"].includes(row.c.status)) throw new TRPCError({ code: "NOT_FOUND" });
      const responder = row.c.initiatedBy === "creator" ? row.c.userId : row.creatorId;
      if (responder !== viewerId) throw new TRPCError({ code: "FORBIDDEN", message: "Waiting on the other person." });

      if (!input.accept) {
        await db
          .update(projectContributor)
          .set({ status: "declined", updatedAt: new Date() })
          .where(eq(projectContributor.id, row.c.id));
        return { ok: true, status: "declined" as const };
      }

      if (row.c.splitBps > 0 && verificationEnforced()) {
        const [person] = await db
          .select({ status: user.verificationStatus })
          .from(user)
          .where(eq(user.id, row.c.userId))
          .limit(1);
        if (person?.status !== "verified") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              row.c.userId === viewerId
                ? "Verify your identity to accept a revenue share."
                : "This person needs to verify their identity before a revenue share can start.",
          });
        }
      }
      if (!splitFits(await acceptedSplits(row.c.projectId, row.c.id), row.c.splitBps)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contributor splits can't exceed 90% in total." });
      }

      const opId = await db.transaction(async (tx) => {
        await tx
          .update(projectContributor)
          .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
          .where(eq(projectContributor.id, row.c.id));
        return enqueueChainOp(tx, {
          kind: "record_contribution",
          refId: row.c.id,
          userId: row.c.userId,
          payload: {
            projectId: row.c.projectId,
            contributorUserId: row.c.userId,
            splitBps: row.c.splitBps,
            agreementHash: row.c.agreementHash,
          },
        });
      });
      processInBackground(opId);
      return { ok: true, status: "accepted" as const };
    }),

  /** Either party ends the arrangement. Future revenue sharing stops; past shares stay paid. */
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .select({ c: projectContributor, creatorId: project.creatorId })
      .from(projectContributor)
      .innerJoin(project, eq(project.id, projectContributor.projectId))
      .where(eq(projectContributor.id, input.id))
      .limit(1);
    if (!row || (row.creatorId !== ctx.session.user.id && row.c.userId !== ctx.session.user.id)) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const wasAccepted = row.c.status === "accepted";
    const opId = await db.transaction(async (tx) => {
      await tx
        .update(projectContributor)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(projectContributor.id, row.c.id));
      if (!wasAccepted) return null;
      return enqueueChainOp(tx, {
        kind: "revoke_contribution",
        refId: `${row.c.id}:revoke`,
        payload: { contributionId: row.c.id },
      });
    });
    if (opId) processInBackground(opId);
    return { ok: true };
  }),

  /** The exact agreement text, for either party or anyone checking an accepted contribution. */
  agreement: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [row] = await db
      .select({ c: projectContributor, creatorId: project.creatorId })
      .from(projectContributor)
      .innerJoin(project, eq(project.id, projectContributor.projectId))
      .where(eq(projectContributor.id, input.id))
      .limit(1);
    if (!row) return null;
    const viewerId = ctx.session?.user?.id;
    const party = viewerId === row.creatorId || viewerId === row.c.userId;
    if (row.c.status !== "accepted" && !party) return null;
    return {
      text: row.c.agreementText,
      hash: row.c.agreementHash,
      version: row.c.agreementVersion,
      status: row.c.status,
    };
  }),

  /** The viewer's contributions and anything waiting on them. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const viewerId = ctx.session.user.id;
    const asContributor = await db
      .select({ c: projectContributor, project: { id: project.id, title: project.title, creatorId: project.creatorId } })
      .from(projectContributor)
      .innerJoin(project, eq(project.id, projectContributor.projectId))
      .where(and(eq(projectContributor.userId, viewerId), ne(projectContributor.status, "removed")))
      .orderBy(desc(projectContributor.updatedAt));
    const onMyProjects = await db
      .select({
        c: projectContributor,
        project: { id: project.id, title: project.title, creatorId: project.creatorId },
        person: { name: user.name, username: user.username },
      })
      .from(projectContributor)
      .innerJoin(project, eq(project.id, projectContributor.projectId))
      .innerJoin(user, eq(user.id, projectContributor.userId))
      .where(and(eq(project.creatorId, viewerId), eq(projectContributor.status, "requested")))
      .orderBy(desc(projectContributor.createdAt));
    return {
      contributions: asContributor.map((r) => ({
        id: r.c.id,
        project: r.project,
        role: r.c.role,
        splitBps: r.c.splitBps,
        status: r.c.status,
        awaitingMe: r.c.status === "invited",
      })),
      requests: onMyProjects.map((r) => ({
        id: r.c.id,
        project: r.project,
        person: r.person,
        role: r.c.role,
        contribution: r.c.contribution,
        splitBps: r.c.splitBps,
        coOwner: r.c.coOwner,
      })),
    };
  }),
});

async function upsertProposal(
  projectId: string,
  contributorId: string,
  initiatedBy: "creator" | "contributor",
  terms: z.infer<typeof termsSchema>,
) {
  const [existing] = await db
    .select()
    .from(projectContributor)
    .where(and(eq(projectContributor.projectId, projectId), eq(projectContributor.userId, contributorId)))
    .limit(1);
  if (existing?.status === "accepted") {
    throw new TRPCError({ code: "CONFLICT", message: "Already a contributor. Remove the current agreement to change it." });
  }
  const { agreement } = await agreementFor(projectId, contributorId, terms);
  const values = {
    role: terms.role,
    contribution: terms.contribution,
    splitBps: terms.splitBps,
    coOwner: terms.coOwner,
    status: initiatedBy === "creator" ? ("invited" as const) : ("requested" as const),
    initiatedBy,
    agreementVersion: agreement.version,
    agreementText: agreement.text,
    agreementHash: agreement.hash,
    acceptedAt: null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(projectContributor).set(values).where(eq(projectContributor.id, existing.id));
    return { ok: true, id: existing.id };
  }
  const [created] = await db
    .insert(projectContributor)
    .values({ projectId, userId: contributorId, ...values })
    .returning({ id: projectContributor.id });
  return { ok: true, id: created!.id };
}
