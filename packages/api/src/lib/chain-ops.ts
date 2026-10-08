/**
 * Durable, idempotent queue for on-chain actions (docs/CHAIN.md § Operations).
 *
 * Lifecycle: pending → submitting → submitted → confirmed | failed.
 * - Rows are unique on (kind, refId), so the same action can't be queued twice.
 * - A row is claimed with a conditional UPDATE before sending, so two workers never send it twice.
 * - Kudos are only credited (import) or refunded (failed export) in the same transaction that moves
 *   the row out of `submitted`, guarded by that status, so balances change exactly once.
 * - Attestations are queued even while the chain is disabled; the reconcile job sends them once
 *   the contracts are configured, which backfills history automatically.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { chainOperation, db, project, type ChainOperation } from "@skaddosh/db";
import { accountRef, chainConfig, hexDigest, recordRef, submit, txStatus, waitForTx, type ChainCall } from "./chain";
import { creditHot, type Tx } from "./kudos-ledger";

export type ChainOpKind =
  | "export"
  | "import"
  | "register_work"
  | "record_contribution"
  | "revoke_contribution"
  | "issue_license"
  | "revoke_license";

const MAX_ATTEMPTS = 5;

type Executor = Tx | typeof db;

export async function enqueueChainOp(
  executor: Executor,
  op: { kind: ChainOpKind; refId: string; userId?: string | null; amount?: number | null; payload: Record<string, unknown> },
): Promise<string> {
  const [inserted] = await executor
    .insert(chainOperation)
    .values({
      kind: op.kind,
      refId: op.refId,
      userId: op.userId ?? null,
      amount: op.amount ?? null,
      payload: op.payload,
    })
    .onConflictDoNothing()
    .returning({ id: chainOperation.id });
  if (inserted) return inserted.id;
  const [existing] = await executor
    .select({ id: chainOperation.id })
    .from(chainOperation)
    .where(and(eq(chainOperation.kind, op.kind), eq(chainOperation.refId, op.refId)))
    .limit(1);
  return existing!.id;
}

/** Fire-and-forget processing for attestations; the reconcile job is the safety net. */
export function processInBackground(opId: string) {
  if (!chainConfig().enabled) return;
  void processChainOp(opId).catch((error) => console.error("[skaddosh] chain op failed", opId, error));
}

async function load(opId: string) {
  const [op] = await db.select().from(chainOperation).where(eq(chainOperation.id, opId)).limit(1);
  return op;
}

/** Ensure the project's work registration is confirmed before attesting anything that references it. */
async function ensureWorkRegistered(projectId: string): Promise<boolean> {
  const [reg] = await db
    .select()
    .from(chainOperation)
    .where(and(eq(chainOperation.kind, "register_work"), eq(chainOperation.refId, projectId)))
    .limit(1);
  if (reg?.status === "confirmed") return true;
  const regId = reg?.id ?? (await enqueueWorkRegistration(projectId));
  if (!regId) return false;
  const done = await processChainOp(regId);
  return done?.status === "confirmed";
}

/** Queue the CreativeRegistry registration for a published project (idempotent). */
export async function enqueueWorkRegistration(projectId: string, executor: Executor = db): Promise<string | null> {
  const [row] = await executor.select().from(project).where(eq(project.id, projectId)).limit(1);
  if (!row) return null;
  const { createHash } = await import("node:crypto");
  const manifest = JSON.stringify({
    id: row.id,
    title: row.title,
    pitch: row.pitch,
    description: row.description,
    coverImage: row.coverImage,
    images: row.images,
    medium: row.medium,
  });
  return enqueueChainOp(executor, {
    kind: "register_work",
    refId: projectId,
    userId: row.creatorId,
    payload: { projectId, contentHash: createHash("sha256").update(manifest).digest("hex"), creatorUserId: row.creatorId },
  });
}

async function buildCall(op: ChainOperation): Promise<ChainCall | "retry"> {
  const p = (op.payload ?? {}) as Record<string, string | number>;
  switch (op.kind as ChainOpKind) {
    case "export":
      return { fn: "mint", to: p.to as `0x${string}`, amount: op.amount!, ref: recordRef(op.id) };
    case "import":
      return {
        fn: "redeemWithPermit",
        from: p.from as `0x${string}`,
        amount: op.amount!,
        ref: recordRef(op.id),
        deadline: BigInt(p.deadline!),
        v: Number(p.v),
        r: p.r as `0x${string}`,
        s: p.s as `0x${string}`,
      };
    case "register_work":
      return {
        fn: "registerWork",
        workId: recordRef(String(p.projectId)),
        contentHash: hexDigest(String(p.contentHash)),
        creatorRef: accountRef(String(p.creatorUserId)),
      };
    case "record_contribution":
      if (!(await ensureWorkRegistered(String(p.projectId)))) return "retry";
      return {
        fn: "recordContribution",
        contributionId: recordRef(op.refId),
        workId: recordRef(String(p.projectId)),
        contributorRef: accountRef(String(p.contributorUserId)),
        splitBps: Number(p.splitBps),
        agreementHash: hexDigest(String(p.agreementHash)),
      };
    case "revoke_contribution":
      return { fn: "revokeContribution", contributionId: recordRef(String(p.contributionId)) };
    case "issue_license":
      if (!(await ensureWorkRegistered(String(p.projectId)))) return "retry";
      return {
        fn: "issueLicense",
        licenseId: recordRef(op.refId),
        workId: recordRef(String(p.projectId)),
        licenseeRef: accountRef(String(p.buyerUserId)),
        tier: p.tier as "personal" | "commercial" | "exclusive",
        termsHash: hexDigest(String(p.termsHash)),
      };
    case "revoke_license":
      return { fn: "revokeLicense", licenseId: recordRef(String(p.licenseId)) };
  }
}

/**
 * Claim, send, and (optionally) wait for one operation. Safe to call concurrently and repeatedly.
 * Returns the operation's latest state.
 */
export async function processChainOp(opId: string, options: { wait?: boolean } = {}): Promise<ChainOperation | undefined> {
  const wait = options.wait ?? true;
  if (!chainConfig().enabled) return load(opId);

  const [claimed] = await db
    .update(chainOperation)
    .set({ status: "submitting", attempts: sql`${chainOperation.attempts} + 1`, updatedAt: new Date() })
    .where(and(eq(chainOperation.id, opId), eq(chainOperation.status, "pending")))
    .returning();
  if (!claimed) {
    const current = await load(opId);
    if (current?.status === "submitted" && current.txHash && wait) {
      return finalize(current, await waitForTx(current.txHash as `0x${string}`));
    }
    return current;
  }

  let txHash: `0x${string}`;
  try {
    const call = await buildCall(claimed);
    if (call === "retry") {
      await db.update(chainOperation).set({ status: "pending", updatedAt: new Date() }).where(eq(chainOperation.id, opId));
      return load(opId);
    }
    txHash = await submit(call);
  } catch (error) {
    return handleSendError(claimed, error);
  }

  await db
    .update(chainOperation)
    .set({ status: "submitted", txHash, error: null, updatedAt: new Date() })
    .where(eq(chainOperation.id, opId));
  if (!wait) return load(opId);
  return finalize({ ...claimed, status: "submitted", txHash }, await waitForTx(txHash));
}

async function handleSendError(op: ChainOperation, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 500) : String(error);
  // A transaction that would revert is final; transport errors are retried.
  const permanent = /revert|ContractFunctionExecutionError|AccessControl|TransfersRestricted|Insufficient/i.test(message);
  if (permanent || op.attempts >= MAX_ATTEMPTS) {
    await failOperation(op.id, "submitting", message);
  } else {
    await db
      .update(chainOperation)
      .set({ status: "pending", error: message, updatedAt: new Date() })
      .where(eq(chainOperation.id, op.id));
  }
  return load(op.id);
}

/** Move a sent operation to its final state, crediting or refunding Kudos exactly once. */
async function finalize(op: ChainOperation, result: "success" | "reverted" | null) {
  if (result === null) return load(op.id); // still pending on-chain; reconcile will check later
  if (result === "reverted") {
    await failOperation(op.id, "submitted", "Transaction reverted");
    return load(op.id);
  }
  await db.transaction(async (tx) => {
    const [moved] = await tx
      .update(chainOperation)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(and(eq(chainOperation.id, op.id), eq(chainOperation.status, "submitted")))
      .returning();
    if (moved?.kind === "import" && moved.userId && moved.amount) {
      await creditHot(tx, moved.userId, moved.amount, { kind: "import_onchain" });
    }
  });
  return load(op.id);
}

async function failOperation(opId: string, fromStatus: "submitting" | "submitted", error: string) {
  await db.transaction(async (tx) => {
    const [moved] = await tx
      .update(chainOperation)
      .set({ status: "failed", error, updatedAt: new Date() })
      .where(and(eq(chainOperation.id, opId), eq(chainOperation.status, fromStatus)))
      .returning();
    // Exported Kudos were taken from the ledger up front; give them back if the mint never happened.
    if (moved?.kind === "export" && moved.userId && moved.amount) {
      await creditHot(tx, moved.userId, moved.amount, { kind: "export_refund" });
    }
  });
}

/** Retry pending operations and settle submitted ones. Called by the cron route. */
export async function reconcileChainOps(limit = 25) {
  if (!chainConfig().enabled) return { enabled: false as const, processed: 0 };
  const stale = new Date(Date.now() - 10_000);

  // Operations claimed by a process that died mid-send go back to pending.
  await db
    .update(chainOperation)
    .set({ status: "pending", updatedAt: new Date() })
    .where(and(eq(chainOperation.status, "submitting"), lt(chainOperation.updatedAt, new Date(Date.now() - 5 * 60_000))));

  const submitted = await db
    .select()
    .from(chainOperation)
    .where(eq(chainOperation.status, "submitted"))
    .limit(limit);
  for (const op of submitted) {
    if (op.txHash) await finalize(op, await txStatus(op.txHash as `0x${string}`));
  }

  // Registrations first, so dependent attestations can go through in the same run.
  const pending = await db
    .select()
    .from(chainOperation)
    .where(and(inArray(chainOperation.status, ["pending"]), lt(chainOperation.updatedAt, stale)))
    .orderBy(sql`case when ${chainOperation.kind} = 'register_work' then 0 else 1 end`, chainOperation.createdAt)
    .limit(limit);
  for (const op of pending) await processChainOp(op.id);

  return { enabled: true as const, processed: submitted.length + pending.length };
}
