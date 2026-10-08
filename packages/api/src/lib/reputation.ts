/**
 * Reputation is a handful of signals you can check, computed live. There is no single score.
 * See docs/PRODUCT.md § Reputation.
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, kudos, project, projectBacking, projectMilestone, projectUpdate, work } from "@skaddosh/db";

export type ReputationSignals = {
  /** Distinct people who gave Kudos to or backed this creator. */
  backedBy: number;
  milestonesDelivered: number;
  milestonesPlanned: number;
  /** Distinct creators this person has given to or backed. */
  supports: number;
  /** Projects backed during Idea that are now Released or Sustaining. */
  earlyBeliever: number;
  processPosts: number;
  kudosReceived: number;
};

/** Distinct supporters per creator, for many creators at once (used by Discover ranking). */
export async function supporterCounts(creatorIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (creatorIds.length === 0) return result;
  const rows = await db.execute<{ creator_id: string; supporters: number }>(sql`
    select creator_id, count(distinct supporter_id)::int as supporters from (
      select w.creator_id, k.from_user_id as supporter_id
        from ${kudos} k join ${work} w on w.id = k.work_id
       where k.from_user_id is not null and k.from_user_id <> w.creator_id
      union all
      select p.creator_id, k.from_user_id
        from ${kudos} k join ${project} p on p.id = k.project_id
       where k.from_user_id is not null and k.from_user_id <> p.creator_id
      union all
      select p.creator_id, b.backer_id
        from ${projectBacking} b join ${project} p on p.id = b.project_id
    ) s
    where creator_id in ${creatorIds}
    group by creator_id
  `);
  for (const row of rows) result.set(row.creator_id, Number(row.supporters));
  return result;
}

export async function reputationFor(userId: string): Promise<ReputationSignals> {
  const [backedByMap, supportsRows, milestoneRows, earlyRows, processRows, receivedRows] = await Promise.all([
    supporterCounts([userId]),
    db.execute<{ creators: number }>(sql`
      select count(distinct creator_id)::int as creators from (
        select w.creator_id from ${kudos} k join ${work} w on w.id = k.work_id where k.from_user_id = ${userId}
        union
        select p.creator_id from ${kudos} k join ${project} p on p.id = k.project_id where k.from_user_id = ${userId}
        union
        select p.creator_id from ${projectBacking} b join ${project} p on p.id = b.project_id where b.backer_id = ${userId}
      ) s where creator_id <> ${userId}
    `),
    db
      .select({
        planned: sql<number>`count(*)::int`,
        delivered: sql<number>`count(${projectMilestone.deliveredAt})::int`,
      })
      .from(projectMilestone)
      .innerJoin(project, eq(project.id, projectMilestone.projectId))
      .where(and(eq(project.creatorId, userId), ne(project.stage, "cancelled"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(projectBacking)
      .innerJoin(project, eq(project.id, projectBacking.projectId))
      .where(
        and(
          eq(projectBacking.backerId, userId),
          eq(projectBacking.stageAtBacking, "idea"),
          inArray(project.stage, ["released", "sustaining"]),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(projectUpdate)
      .where(and(eq(projectUpdate.authorId, userId), eq(projectUpdate.kind, "process"))),
    db.execute<{ total: number }>(sql`
      select coalesce(sum(k.amount), 0)::int as total
        from ${kudos} k
        left join ${work} w on w.id = k.work_id
        left join ${project} p on p.id = k.project_id
       where coalesce(w.creator_id, p.creator_id) = ${userId}
    `),
  ]);

  return {
    backedBy: backedByMap.get(userId) ?? 0,
    supports: Number(supportsRows[0]?.creators ?? 0),
    milestonesPlanned: milestoneRows[0]?.planned ?? 0,
    milestonesDelivered: milestoneRows[0]?.delivered ?? 0,
    earlyBeliever: earlyRows[0]?.n ?? 0,
    processPosts: processRows[0]?.n ?? 0,
    kudosReceived: Number(receivedRows[0]?.total ?? 0),
  };
}
