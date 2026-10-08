import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, asc, ne, sql, inArray } from "drizzle-orm";
import {
  AI_USAGE,
  db,
  follow,
  kudos,
  project,
  projectBacking,
  projectMilestone,
  projectUpdate,
  user,
  type Project,
} from "@skaddosh/db";
import { router, protectedProcedure, publicProcedure, creatorProcedure } from "../trpc";
import { randomUUID } from "crypto";
import { canViewFull, hasContentAccess } from "../lib/content-access";
import {
  KUDOS,
  PROJECT_STAGES,
  acceptsBacking,
  canWithdrawBacking,
  deliveredPercent,
  lockedAmount,
  returnCapFor,
  validateMilestonePlan,
  weightedAmount,
  type ProjectStage,
} from "../lib/kudos-economy";
import {
  debitHot,
  distributeProjectIncome,
  lockProject,
  recordLedger,
  releaseColdKudos,
  releaseForDeliveredMilestones,
  thawColdKudos,
} from "../lib/kudos-ledger";
import { parseAiUsage, parseOpenRoles, projectCard } from "../lib/project-view";
import { notifyOwnerInbox } from "./portfolios";

function parseProject(p: Project) {
  return {
    ...p,
    stage: p.stage as ProjectStage,
    images: JSON.parse(p.images) as string[],
    tags: JSON.parse(p.tags) as string[],
    openRoles: parseOpenRoles(p.openRolesJson),
    aiUsage: parseAiUsage(p.aiUsageJson),
  };
}

/** Stage changes a creator may make, and what each one does to Cold Kudos. */
const STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  idea: ["making", "released", "cancelled"],
  making: ["released", "cancelled"],
  released: ["sustaining"],
  sustaining: [],
  cancelled: [],
};

async function ownedProject(projectId: string, userId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.creatorId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

async function publishedProject(projectId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.status, "published")))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return row;
}

const roleSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).default(""),
});

export const projectsRouter = router({
  /** Published projects for Discover, profiles, and circles. */
  list: publicProcedure
    .input(
      z
        .object({
          creatorUsername: z.string().optional(),
          stage: z.enum(PROJECT_STAGES).optional(),
          seekingBackers: z.boolean().optional(),
          limit: z.number().int().min(1).max(60).default(24),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [eq(project.status, "published"), ne(project.stage, "cancelled")];
      if (input?.creatorUsername) conditions.push(eq(user.username, input.creatorUsername));
      if (input?.stage) conditions.push(eq(project.stage, input.stage));
      if (input?.seekingBackers) {
        conditions.push(inArray(project.stage, ["idea", "making"]));
        conditions.push(sql`${project.backingGoal} > 0`);
      }
      const rows = await db
        .select({ p: project, creator: { name: user.name, username: user.username, image: user.image } })
        .from(project)
        .innerJoin(user, eq(project.creatorId, user.id))
        .where(and(...conditions))
        .orderBy(desc(project.updatedAt))
        .limit(input?.limit ?? 24);
      return rows.map((r) => projectCard(r.p, r.creator));
    }),

  publicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({
          p: project,
          creator: { id: user.id, name: user.name, username: user.username, image: user.image, bio: user.bio },
        })
        .from(project)
        .innerJoin(user, eq(project.creatorId, user.id))
        .where(and(eq(project.id, input.id), eq(project.status, "published")))
        .limit(1);
      if (!row) return null;

      const viewerId = ctx.session?.user?.id;
      const isOwner = viewerId === row.p.creatorId;
      const unlocked =
        canViewFull(row.p, viewerId) || (await hasContentAccess("project", row.p.id, viewerId));

      const [milestones, updates, backerRows, viewerBacking, viewerFollow, recentKudos] = await Promise.all([
        db
          .select()
          .from(projectMilestone)
          .where(eq(projectMilestone.projectId, row.p.id))
          .orderBy(asc(projectMilestone.position)),
        db
          .select()
          .from(projectUpdate)
          .where(eq(projectUpdate.projectId, row.p.id))
          .orderBy(desc(projectUpdate.createdAt))
          .limit(30),
        db
          .select({
            backerNumber: projectBacking.backerNumber,
            stageAtBacking: projectBacking.stageAtBacking,
            amount: projectBacking.amount,
            refunded: projectBacking.refunded,
            backer: { name: user.name, username: user.username, image: user.image },
          })
          .from(projectBacking)
          .innerJoin(user, eq(projectBacking.backerId, user.id))
          .where(eq(projectBacking.projectId, row.p.id))
          .orderBy(asc(projectBacking.backerNumber))
          .limit(60),
        viewerId
          ? db
              .select()
              .from(projectBacking)
              .where(and(eq(projectBacking.projectId, row.p.id), eq(projectBacking.backerId, viewerId)))
              .limit(1)
          : Promise.resolve([]),
        viewerId
          ? db
              .select({ creatorId: follow.creatorId })
              .from(follow)
              .where(and(eq(follow.followerId, viewerId), eq(follow.creatorId, row.p.creatorId)))
              .limit(1)
          : Promise.resolve([]),
        db
          .select({
            id: kudos.id,
            amount: kudos.amount,
            message: kudos.message,
            createdAt: kudos.createdAt,
            giver: { name: user.name, username: user.username },
          })
          .from(kudos)
          .leftJoin(user, eq(kudos.fromUserId, user.id))
          .where(eq(kudos.projectId, row.p.id))
          .orderBy(desc(kudos.createdAt))
          .limit(20),
      ]);

      const mine = viewerBacking[0];
      const parsed = parseProject(row.p);
      const shared = {
        id: row.p.id,
        title: row.p.title,
        pitch: row.p.pitch,
        coverImage: row.p.coverImage,
        accentColor: row.p.accentColor,
        tags: parsed.tags,
        stage: parsed.stage,
        aiUsage: parsed.aiUsage,
        humanMadeConfirmedAt: row.p.humanMadeConfirmedAt,
        creator: row.creator,
        createdAt: row.p.createdAt,
        updatedAt: row.p.updatedAt,
        lastUpdateAt: updates[0]?.createdAt ?? null,
        backing: {
          goal: row.p.backingGoal,
          cold: row.p.coldKudosTotal,
          backersCount: row.p.backersCount,
          kudosReceived: row.p.kudosReceived,
          backerSharePercent: row.p.backerSharePercent,
          returnCapPercent: row.p.returnCapPercent,
          acceptsBacking: acceptsBacking(parsed.stage) && !isOwner,
          stageWeightPercent: parsed.stage === "idea" ? 150 : parsed.stage === "making" ? 125 : null,
          releasedPercent: parsed.stage === "released" || parsed.stage === "sustaining" ? 100 : deliveredPercent(milestones),
        },
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          releasePercent: m.releasePercent,
          dueAt: m.dueAt,
          deliveredAt: m.deliveredAt,
        })),
        updates: updates.map((u) => ({ id: u.id, kind: u.kind, body: u.body, createdAt: u.createdAt, milestoneId: u.milestoneId })),
        backers: backerRows
          .filter((b) => b.amount - b.refunded > 0)
          .map((b) => ({
            backerNumber: b.backerNumber,
            earlyBeliever: b.stageAtBacking === "idea",
            backer: b.backer,
          })),
        openRoles: parsed.openRoles,
        recentKudos,
        viewer: {
          signedIn: Boolean(viewerId),
          isOwner,
          following: viewerFollow.length > 0,
          backing: mine
            ? {
                backerNumber: mine.backerNumber,
                earlyBeliever: mine.stageAtBacking === "idea",
                amount: mine.amount - mine.refunded,
                locked: lockedAmount(mine),
                released: mine.released,
                returned: mine.returned,
                returnCap: returnCapFor(mine, row.p.returnCapPercent),
                canWithdraw: canWithdrawBacking(mine),
              }
            : null,
        },
      };

      if (!unlocked) {
        return {
          ...shared,
          locked: true as const,
          description: row.p.description.slice(0, 200),
          unlockMethod: row.p.unlockMethod,
          kudosPrice: row.p.kudosPrice,
        };
      }

      return {
        ...shared,
        locked: false as const,
        description: row.p.description,
        images: parsed.images,
        url: row.p.url,
        repoUrl: row.p.repoUrl,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(project)
      .where(eq(project.creatorId, ctx.session.user.id))
      .orderBy(desc(project.updatedAt));
    return rows.map(parseProject);
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ownedProject(input.id, ctx.session.user.id);
      const [milestones, updates] = await Promise.all([
        db.select().from(projectMilestone).where(eq(projectMilestone.projectId, row.id)).orderBy(asc(projectMilestone.position)),
        db.select().from(projectUpdate).where(eq(projectUpdate.projectId, row.id)).orderBy(desc(projectUpdate.createdAt)).limit(30),
      ]);
      return { ...parseProject(row), milestones, updates };
    }),

  create: creatorProcedure
    .input(
      z.object({
        title: z.string().max(200).default(""),
        accentColor: z.string().default("#6366f1"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = `proj_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      await db.insert(project).values({
        id,
        creatorId: ctx.session.user.id,
        title: input.title,
        description: "",
        status: "draft",
        stage: "idea",
        accentColor: input.accentColor,
        images: "[]",
        tags: "[]",
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(200).optional(),
        pitch: z.string().max(160).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        coverImage: z.string().url().nullable().optional(),
        images: z.array(z.string()).max(20).optional(),
        url: z.string().url().nullable().optional(),
        repoUrl: z.string().url().nullable().optional(),
        tags: z.array(z.string().max(40)).max(10).optional(),
        accentColor: z.string().optional(),
        visibility: z.enum(["public", "confidential"]).optional(),
        unlockMethod: z.enum(["request", "kudos"]).optional(),
        kudosPrice: z.number().int().min(0).max(500).optional(),
        backingGoal: z.number().int().min(0).max(100_000).optional(),
        backerSharePercent: z.number().int().min(0).max(KUDOS.BACKER_SHARE_MAX_PERCENT).optional(),
        returnCapPercent: z.number().int().min(KUDOS.RETURN_CAP_MIN_PERCENT).max(KUDOS.RETURN_CAP_MAX_PERCENT).optional(),
        openRoles: z.array(roleSchema).max(8).optional(),
        aiUsage: z.array(z.enum(AI_USAGE)).max(AI_USAGE.length).optional(),
        humanMadeConfirmed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ownedProject(input.id, ctx.session.user.id);

      // Backers committed under the current terms. Terms may only become more generous.
      if (existing.backersCount > 0) {
        if (input.backerSharePercent !== undefined && input.backerSharePercent < existing.backerSharePercent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The backer share can't go down once people have backed this project." });
        }
        if (input.returnCapPercent !== undefined && input.returnCapPercent < existing.returnCapPercent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The return cap can't go down once people have backed this project." });
        }
      }

      const humanMadeConfirmedAt =
        input.humanMadeConfirmed === undefined
          ? existing.humanMadeConfirmedAt
          : input.humanMadeConfirmed
            ? existing.humanMadeConfirmedAt ?? new Date()
            : null;
      const status = input.status ?? existing.status;
      if (status === "published" && !humanMadeConfirmedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirm this project is your original, human-made work before publishing.",
        });
      }

      await db
        .update(project)
        .set({
          title: input.title ?? existing.title,
          pitch: input.pitch ?? existing.pitch,
          description: input.description ?? existing.description,
          status,
          coverImage: input.coverImage !== undefined ? input.coverImage : existing.coverImage,
          images: input.images !== undefined ? JSON.stringify(input.images) : existing.images,
          url: input.url !== undefined ? input.url : existing.url,
          repoUrl: input.repoUrl !== undefined ? input.repoUrl : existing.repoUrl,
          tags: input.tags !== undefined ? JSON.stringify(input.tags) : existing.tags,
          accentColor: input.accentColor ?? existing.accentColor,
          visibility: input.visibility ?? existing.visibility,
          unlockMethod: input.unlockMethod ?? existing.unlockMethod,
          kudosPrice: input.kudosPrice ?? existing.kudosPrice,
          backingGoal: input.backingGoal ?? existing.backingGoal,
          backerSharePercent: input.backerSharePercent ?? existing.backerSharePercent,
          returnCapPercent: input.returnCapPercent ?? existing.returnCapPercent,
          openRolesJson: input.openRoles !== undefined ? JSON.stringify(input.openRoles) : existing.openRolesJson,
          aiUsageJson: input.aiUsage !== undefined ? JSON.stringify(input.aiUsage) : existing.aiUsageJson,
          humanMadeConfirmedAt,
          updatedAt: new Date(),
        })
        .where(eq(project.id, input.id));

      return { ok: true };
    }),

  /** Replace the undelivered part of the milestone plan. Delivered milestones are frozen. */
  setMilestones: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        milestones: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(120),
              description: z.string().trim().max(600).default(""),
              releasePercent: z.number().int().min(0).max(100),
              dueAt: z.coerce.date().nullable().optional(),
            }),
          )
          .max(KUDOS.MAX_MILESTONES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ownedProject(input.projectId, ctx.session.user.id);
      const existing = await db.select().from(projectMilestone).where(eq(projectMilestone.projectId, row.id));
      const delivered = existing.filter((m) => m.deliveredAt);
      const error = validateMilestonePlan([...delivered, ...input.milestones]);
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error });

      await db.transaction(async (tx) => {
        const pending = existing.filter((m) => !m.deliveredAt).map((m) => m.id);
        if (pending.length) await tx.delete(projectMilestone).where(inArray(projectMilestone.id, pending));
        if (input.milestones.length) {
          await tx.insert(projectMilestone).values(
            input.milestones.map((m, index) => ({
              projectId: row.id,
              position: delivered.length + index,
              title: m.title,
              description: m.description,
              releasePercent: m.releasePercent,
              dueAt: m.dueAt ?? null,
            })),
          );
        }
        await tx.update(project).set({ updatedAt: new Date() }).where(eq(project.id, row.id));
      });
      return { ok: true };
    }),

  deliverMilestone: protectedProcedure
    .input(z.object({ milestoneId: z.string(), note: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const [milestone] = await db.select().from(projectMilestone).where(eq(projectMilestone.id, input.milestoneId)).limit(1);
      if (!milestone) throw new TRPCError({ code: "NOT_FOUND" });
      await ownedProject(milestone.projectId, ctx.session.user.id);
      if (milestone.deliveredAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Milestone already delivered." });

      const released = await db.transaction(async (tx) => {
        const row = await lockProject(tx, milestone.projectId);
        if (row.stage === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "This project is cancelled." });
        const now = new Date();
        await tx.update(projectMilestone).set({ deliveredAt: now }).where(eq(projectMilestone.id, milestone.id));
        await tx.insert(projectUpdate).values({
          projectId: row.id,
          authorId: row.creatorId,
          kind: "milestone",
          body: input.note,
          milestoneId: milestone.id,
          createdAt: now,
        });
        await tx.update(project).set({ updatedAt: now }).where(eq(project.id, row.id));
        return releaseForDeliveredMilestones(tx, row);
      });
      return { ok: true, released };
    }),

  setStage: protectedProcedure
    .input(z.object({ projectId: z.string(), stage: z.enum(PROJECT_STAGES), note: z.string().trim().max(4000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ownedProject(input.projectId, ctx.session.user.id);
      return db.transaction(async (tx) => {
        const row = await lockProject(tx, input.projectId);
        const from = row.stage as ProjectStage;
        if (!STAGE_TRANSITIONS[from].includes(input.stage)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `A project can't move from ${from} to ${input.stage}.` });
        }
        const now = new Date();
        await tx.update(project).set({ stage: input.stage, updatedAt: now }).where(eq(project.id, row.id));
        await tx.insert(projectUpdate).values({
          projectId: row.id,
          authorId: row.creatorId,
          kind: "stage",
          body: input.note || `Moved to ${input.stage}.`,
          createdAt: now,
        });

        let released = 0;
        let refunded = 0;
        if (input.stage === "released") released = await releaseColdKudos(tx, row, 100);
        if (input.stage === "cancelled") refunded = await thawColdKudos(tx, row);
        return { ok: true, released, refunded };
      });
    }),

  postUpdate: protectedProcedure
    .input(z.object({ projectId: z.string(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const row = await ownedProject(input.projectId, ctx.session.user.id);
      const now = new Date();
      await db.insert(projectUpdate).values({ projectId: row.id, authorId: row.creatorId, kind: "process", body: input.body, createdAt: now });
      await db.update(project).set({ updatedAt: now }).where(eq(project.id, row.id));
      return { ok: true };
    }),

  /** Appreciation: Hot Kudos to the project, split between backers (returns) and the creator. */
  giveKudos: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        amount: z.number().int().min(KUDOS.GIVE_MIN).max(KUDOS.GIVE_MAX),
        message: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const giverId = ctx.session.user.id;
      const target = await publishedProject(input.projectId);
      if (target.creatorId === giverId) throw new TRPCError({ code: "BAD_REQUEST", message: "You can't give Kudos to your own project." });
      if (target.stage === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "This project is cancelled." });

      const split = await db.transaction(async (tx) => {
        const row = await lockProject(tx, input.projectId);
        await debitHot(tx, giverId, input.amount, { kind: "give", projectId: row.id, counterpartyId: row.creatorId });
        await tx.insert(kudos).values({
          id: randomUUID(),
          projectId: row.id,
          fromUserId: giverId,
          amount: input.amount,
          message: input.message || null,
          createdAt: new Date(),
        });
        return distributeProjectIncome(tx, row, input.amount, giverId, "receive");
      });
      return { ok: true, toBackers: input.amount - split.creatorAmount };
    }),

  /** Commit Hot Kudos to a project in Idea or Making. They become Cold Kudos. */
  back: protectedProcedure
    .input(z.object({ projectId: z.string(), amount: z.number().int().min(KUDOS.BACKING_MIN).max(KUDOS.BACKING_MAX) }))
    .mutation(async ({ ctx, input }) => {
      const backerId = ctx.session.user.id;
      await publishedProject(input.projectId);

      return db.transaction(async (tx) => {
        const row = await lockProject(tx, input.projectId);
        const stage = row.stage as ProjectStage;
        if (row.creatorId === backerId) throw new TRPCError({ code: "BAD_REQUEST", message: "You can't back your own project." });
        if (!acceptsBacking(stage)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only projects in Idea or Making accept backing." });
        }

        await debitHot(tx, backerId, input.amount, { kind: "back", projectId: row.id, counterpartyId: row.creatorId });
        await recordLedger(tx, backerId, "cold", input.amount, { kind: "back", projectId: row.id, counterpartyId: row.creatorId });

        const weighted = weightedAmount(input.amount, stage);
        const now = new Date();
        const [existing] = await tx
          .select()
          .from(projectBacking)
          .where(and(eq(projectBacking.projectId, row.id), eq(projectBacking.backerId, backerId)))
          .limit(1);

        let backerNumber: number;
        if (existing) {
          backerNumber = existing.backerNumber;
          const wasActive = existing.amount - existing.refunded > 0;
          await tx
            .update(projectBacking)
            .set({
              amount: sql`${projectBacking.amount} + ${input.amount}`,
              weightedAmount: sql`${projectBacking.weightedAmount} + ${weighted}`,
              lastToppedUpAt: now,
            })
            .where(eq(projectBacking.id, existing.id));
          if (!wasActive) {
            await tx.update(project).set({ backersCount: sql`${project.backersCount} + 1` }).where(eq(project.id, row.id));
          }
        } else {
          const [{ count }] = (await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(projectBacking)
            .where(eq(projectBacking.projectId, row.id))) as [{ count: number }];
          backerNumber = count + 1;
          await tx.insert(projectBacking).values({
            projectId: row.id,
            backerId,
            backerNumber,
            stageAtBacking: stage,
            amount: input.amount,
            weightedAmount: weighted,
            createdAt: now,
            lastToppedUpAt: now,
          });
          await tx.update(project).set({ backersCount: sql`${project.backersCount} + 1` }).where(eq(project.id, row.id));
        }

        await tx
          .update(project)
          .set({ coldKudosTotal: sql`${project.coldKudosTotal} + ${input.amount}` })
          .where(eq(project.id, row.id));

        // Late backers fund milestones that are already delivered right away.
        await releaseForDeliveredMilestones(tx, row);

        return { ok: true, backerNumber, weighted };
      });
    }),

  /** Change of heart: withdraw a backing within 48 hours if none of it has been released. */
  withdrawBacking: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const backerId = ctx.session.user.id;
      return db.transaction(async (tx) => {
        const row = await lockProject(tx, input.projectId);
        const [mine] = await tx
          .select()
          .from(projectBacking)
          .where(and(eq(projectBacking.projectId, row.id), eq(projectBacking.backerId, backerId)))
          .limit(1);
        if (!mine || !canWithdrawBacking(mine)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This backing can no longer be withdrawn." });
        }
        const refunded = await thawColdKudos(tx, row, backerId);
        await tx.update(project).set({ backersCount: sql`greatest(0, ${project.backersCount} - 1)` }).where(eq(project.id, row.id));
        return { ok: true, refunded };
      });
    }),

  /** Raise your hand for an open role; delivered to the creator's inbox. */
  raiseHand: protectedProcedure
    .input(z.object({ projectId: z.string(), role: z.string().max(80), message: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const row = await publishedProject(input.projectId);
      if (row.creatorId === ctx.session.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "This is your project." });
      const [me] = await db.select().from(user).where(eq(user.id, ctx.session.user.id)).limit(1);
      const delivered = await notifyOwnerInbox(row.creatorId, {
        kind: "contact",
        subject: `Collaboration: ${input.role} · ${row.title || "your project"}`,
        from: { name: me?.name ?? "A collaborator", email: me?.email ?? "" },
        body: input.message,
        meta: { contentType: "project", contentId: row.id },
      });
      return { ok: true, delivered };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownedProject(input.id, ctx.session.user.id);
      await db.transaction(async (tx) => {
        const row = await lockProject(tx, input.id);
        // Never destroy Cold Kudos: anything still locked goes back to its backers first.
        await thawColdKudos(tx, row);
        await tx.delete(project).where(eq(project.id, row.id));
      });
      return { ok: true };
    }),
});
