/**
 * Database side of the Kudos economy. Every helper takes a transaction so balance changes,
 * counters, and ledger rows commit together. The rules themselves live in kudos-economy.ts.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  kudosLedger,
  project,
  projectBacking,
  projectMilestone,
  user,
  type DB,
  type KudosCurrency,
  type KudosLedgerKind,
  type Project,
} from "@skaddosh/db";
import { computeReleases, deliveredPercent, lockedAmount, splitIncomingKudos, weightAfterRefund } from "./kudos-economy";

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

type LedgerRef = {
  kind: KudosLedgerKind;
  workId?: string | null;
  projectId?: string | null;
  counterpartyId?: string | null;
};

export async function recordLedger(
  tx: Tx,
  userId: string,
  currency: KudosCurrency,
  delta: number,
  ref: LedgerRef,
) {
  if (delta === 0) return;
  await tx.insert(kudosLedger).values({
    userId,
    currency,
    delta,
    kind: ref.kind,
    workId: ref.workId ?? null,
    projectId: ref.projectId ?? null,
    counterpartyId: ref.counterpartyId ?? null,
  });
}

/** Atomically take Hot Kudos from a user, failing (without side effects) if they can't afford it. */
export async function debitHot(tx: Tx, userId: string, amount: number, ref: LedgerRef) {
  if (amount <= 0) return;
  const updated = await tx
    .update(user)
    .set({ kudosBalance: sql`${user.kudosBalance} - ${amount}`, updatedAt: new Date() })
    .where(and(eq(user.id, userId), gte(user.kudosBalance, amount)))
    .returning({ id: user.id });
  if (updated.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not enough Hot Kudos." });
  }
  await recordLedger(tx, userId, "hot", -amount, ref);
}

export async function creditHot(tx: Tx, userId: string, amount: number, ref: LedgerRef) {
  if (amount <= 0) return;
  await tx
    .update(user)
    .set({ kudosBalance: sql`${user.kudosBalance} + ${amount}`, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await recordLedger(tx, userId, "hot", amount, ref);
}

/** Lock a project row for the rest of the transaction so concurrent backings/releases serialize. */
export async function lockProject(tx: Tx, projectId: string): Promise<Project> {
  const [row] = await tx.select().from(project).where(eq(project.id, projectId)).for("update").limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return row;
}

/**
 * Route Kudos a project receives: the backer share goes to backers (as returns, capped),
 * the rest to the creator. `creatorKind` describes why the creator is credited.
 */
export async function distributeProjectIncome(
  tx: Tx,
  row: Project,
  incoming: number,
  fromUserId: string,
  creatorKind: "receive" | "unlock_earn",
) {
  const backings = await tx.select().from(projectBacking).where(eq(projectBacking.projectId, row.id));
  const split = splitIncomingKudos(incoming, backings, row.backerSharePercent, row.returnCapPercent);

  for (const portion of split.portions) {
    const b = backings.find((item) => item.id === portion.id)!;
    await tx
      .update(projectBacking)
      .set({ returned: sql`${projectBacking.returned} + ${portion.amount}` })
      .where(eq(projectBacking.id, b.id));
    await creditHot(tx, b.backerId, portion.amount, {
      kind: "return",
      projectId: row.id,
      counterpartyId: fromUserId,
    });
  }

  await creditHot(tx, row.creatorId, split.creatorAmount, {
    kind: creatorKind,
    projectId: row.id,
    counterpartyId: fromUserId,
  });

  await tx
    .update(project)
    .set({ kudosReceived: sql`${project.kudosReceived} + ${incoming}` })
    .where(eq(project.id, row.id));

  return split;
}

/** Release Cold Kudos to the creator up to `percent` (cumulative, 0–100). Returns the total released. */
export async function releaseColdKudos(tx: Tx, row: Project, percent: number) {
  const backings = await tx.select().from(projectBacking).where(eq(projectBacking.projectId, row.id));
  const releases = computeReleases(backings, percent);
  let total = 0;

  for (const { id, release } of releases) {
    const b = backings.find((item) => item.id === id)!;
    await tx
      .update(projectBacking)
      .set({ released: sql`${projectBacking.released} + ${release}` })
      .where(eq(projectBacking.id, id));
    await recordLedger(tx, b.backerId, "cold", -release, {
      kind: "release",
      projectId: row.id,
      counterpartyId: row.creatorId,
    });
    total += release;
  }

  await creditHot(tx, row.creatorId, total, { kind: "release", projectId: row.id });
  return total;
}

/** Release according to the project's delivered milestones. */
export async function releaseForDeliveredMilestones(tx: Tx, row: Project) {
  const milestones = await tx.select().from(projectMilestone).where(eq(projectMilestone.projectId, row.id));
  return releaseColdKudos(tx, row, deliveredPercent(milestones));
}

/** Thaw every locked Cold Kudo back to its backer as Hot. Returns the total refunded. */
export async function thawColdKudos(tx: Tx, row: Project, onlyBackerId?: string) {
  const backings = await tx
    .select()
    .from(projectBacking)
    .where(
      onlyBackerId
        ? and(eq(projectBacking.projectId, row.id), eq(projectBacking.backerId, onlyBackerId))
        : eq(projectBacking.projectId, row.id),
    );
  let total = 0;

  for (const b of backings) {
    const locked = lockedAmount(b);
    if (locked <= 0) continue;
    await tx
      .update(projectBacking)
      .set({ refunded: sql`${projectBacking.refunded} + ${locked}`, weightedAmount: weightAfterRefund(b, locked) })
      .where(eq(projectBacking.id, b.id));
    await recordLedger(tx, b.backerId, "cold", -locked, { kind: "refund", projectId: row.id });
    await creditHot(tx, b.backerId, locked, { kind: "refund", projectId: row.id });
    total += locked;
  }

  if (total > 0) {
    await tx
      .update(project)
      .set({ coldKudosTotal: sql`greatest(0, ${project.coldKudosTotal} - ${total})` })
      .where(eq(project.id, row.id));
  }
  return total;
}
