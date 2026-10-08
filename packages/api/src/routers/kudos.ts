import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, kudosLedger, project, projectBacking, user, work } from "@skaddosh/db";
import { protectedProcedure, router } from "../trpc";
import { KUDOS, canWithdrawBacking, lockedAmount, returnCapFor, weeklyAllowanceStatus, type ProjectStage } from "../lib/kudos-economy";
import { creditHot } from "../lib/kudos-ledger";

export const kudosRouter = router({
  /** Everything the wallet header and /kudos page need in one round trip. */
  wallet: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [[me], [totals], [earned]] = await Promise.all([
      db
        .select({ hot: user.kudosBalance, weeklyKudosClaimedAt: user.weeklyKudosClaimedAt })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
      db
        .select({
          cold: sql<number>`coalesce(sum(${projectBacking.amount} - ${projectBacking.released} - ${projectBacking.refunded}), 0)::int`,
          committed: sql<number>`coalesce(sum(${projectBacking.amount} - ${projectBacking.refunded}), 0)::int`,
          returned: sql<number>`coalesce(sum(${projectBacking.returned}), 0)::int`,
          projects: sql<number>`count(*) filter (where ${projectBacking.amount} > ${projectBacking.refunded})::int`,
        })
        .from(projectBacking)
        .where(eq(projectBacking.backerId, userId)),
      db
        .select({
          received: sql<number>`coalesce(sum(${kudosLedger.delta}) filter (where ${kudosLedger.kind} in ('receive', 'unlock_earn')), 0)::int`,
          released: sql<number>`coalesce(sum(${kudosLedger.delta}) filter (where ${kudosLedger.kind} = 'release' and ${kudosLedger.currency} = 'hot'), 0)::int`,
        })
        .from(kudosLedger)
        .where(eq(kudosLedger.userId, userId)),
    ]);
    if (!me) throw new TRPCError({ code: "NOT_FOUND" });

    const allowance = weeklyAllowanceStatus(me.hot, me.weeklyKudosClaimedAt);
    return {
      hot: me.hot,
      cold: totals?.cold ?? 0,
      committed: totals?.committed ?? 0,
      returnsEarned: totals?.returned ?? 0,
      backedProjects: totals?.projects ?? 0,
      creatorEarnings: { received: earned?.received ?? 0, released: earned?.released ?? 0 },
      allowance: {
        amount: KUDOS.WEEKLY_ALLOWANCE,
        claimable: allowance.claimable,
        reason: allowance.claimable ? null : allowance.reason,
        nextClaimAt: !allowance.claimable && allowance.reason === "too_soon" ? allowance.nextClaimAt : null,
      },
    };
  }),

  claimWeekly: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return db.transaction(async (tx) => {
      const [me] = await tx
        .select({ hot: user.kudosBalance, weeklyKudosClaimedAt: user.weeklyKudosClaimedAt })
        .from(user)
        .where(eq(user.id, userId))
        .for("update")
        .limit(1);
      if (!me) throw new TRPCError({ code: "NOT_FOUND" });
      const status = weeklyAllowanceStatus(me.hot, me.weeklyKudosClaimedAt);
      if (!status.claimable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            status.reason === "too_soon"
              ? "You've already claimed this week's Kudos."
              : `The weekly allowance is for balances under ${KUDOS.WEEKLY_ALLOWANCE_BALANCE_CEILING}. Give some away first.`,
        });
      }
      await tx.update(user).set({ weeklyKudosClaimedAt: new Date() }).where(eq(user.id, userId));
      await creditHot(tx, userId, KUDOS.WEEKLY_ALLOWANCE, { kind: "weekly_allowance" });
      return { ok: true, amount: KUDOS.WEEKLY_ALLOWANCE };
    });
  }),

  /** The viewer's backing positions, newest first. */
  backings: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        b: projectBacking,
        p: {
          id: project.id,
          title: project.title,
          pitch: project.pitch,
          coverImage: project.coverImage,
          accentColor: project.accentColor,
          stage: project.stage,
          returnCapPercent: project.returnCapPercent,
          backerSharePercent: project.backerSharePercent,
        },
        creator: { name: user.name, username: user.username },
      })
      .from(projectBacking)
      .innerJoin(project, eq(project.id, projectBacking.projectId))
      .innerJoin(user, eq(user.id, project.creatorId))
      .where(eq(projectBacking.backerId, ctx.session.user.id))
      .orderBy(desc(projectBacking.lastToppedUpAt));

    return rows.map(({ b, p, creator }) => ({
      project: { ...p, stage: p.stage as ProjectStage },
      creator,
      backerNumber: b.backerNumber,
      earlyBeliever: b.stageAtBacking === "idea",
      amount: b.amount - b.refunded,
      locked: lockedAmount(b),
      released: b.released,
      refunded: b.refunded,
      returned: b.returned,
      returnCap: returnCapFor(b, p.returnCapPercent),
      canWithdraw: canWithdrawBacking(b),
      createdAt: b.createdAt,
    }));
  }),

  /** Wallet history from the ledger. */
  history: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional())
    .query(async ({ ctx, input }) => {
      const counterparty = alias(user, "counterparty");
      const rows = await db
        .select({
          id: kudosLedger.id,
          currency: kudosLedger.currency,
          delta: kudosLedger.delta,
          kind: kudosLedger.kind,
          createdAt: kudosLedger.createdAt,
          project: { id: project.id, title: project.title },
          workTitleJson: work.titleJson,
          workId: work.id,
          counterparty: { name: counterparty.name, username: counterparty.username },
        })
        .from(kudosLedger)
        .leftJoin(project, eq(project.id, kudosLedger.projectId))
        .leftJoin(work, eq(work.id, kudosLedger.workId))
        .leftJoin(counterparty, eq(counterparty.id, kudosLedger.counterpartyId))
        .where(eq(kudosLedger.userId, ctx.session.user.id))
        .orderBy(desc(kudosLedger.createdAt))
        .limit(input?.limit ?? 40);

      return rows.map(({ workTitleJson, workId, ...row }) => {
        let workTitle: string | null = null;
        if (workTitleJson) {
          try {
            const t = JSON.parse(workTitleJson) as Record<string, string>;
            workTitle = t.en || t.ar || t.fr || t.es || "Untitled";
          } catch {
            workTitle = "Untitled";
          }
        }
        return {
          ...row,
          project: row.project?.id ? row.project : null,
          work: workId ? { id: workId, title: workTitle } : null,
          counterparty: row.counterparty?.name ? row.counterparty : null,
        };
      });
    }),
});
