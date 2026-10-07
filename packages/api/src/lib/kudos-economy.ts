/**
 * Pure Kudos economy rules. No database access here. Routers load state, call these
 * functions, and persist the results inside a transaction.
 *
 * The constants and formulas are documented in docs/KUDOS.md. Keep the two in sync.
 */

export const KUDOS = {
  SIGNUP_GRANT: 25,
  WEEKLY_ALLOWANCE: 10,
  WEEKLY_ALLOWANCE_INTERVAL_MS: 7 * 24 * 60 * 60 * 1000,
  /** The allowance is for giving, so it isn't paid once a Hot balance reaches this. */
  WEEKLY_ALLOWANCE_BALANCE_CEILING: 100,
  GIVE_MIN: 1,
  GIVE_MAX: 5,
  COMMENT_COST: 3,
  BACKING_MIN: 5,
  BACKING_MAX: 500,
  BACKER_SHARE_MAX_PERCENT: 30,
  RETURN_CAP_MIN_PERCENT: 100,
  RETURN_CAP_MAX_PERCENT: 300,
  CHANGE_OF_HEART_MS: 48 * 60 * 60 * 1000,
  MAX_MILESTONES: 6,
} as const;

export const PROJECT_STAGES = ["idea", "making", "released", "sustaining", "cancelled"] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

/** Stage weight in percent. Only stages that accept backing have one. */
export const STAGE_WEIGHT_PERCENT: Partial<Record<ProjectStage, number>> = {
  idea: 150,
  making: 125,
};

export function acceptsBacking(stage: ProjectStage): boolean {
  return STAGE_WEIGHT_PERCENT[stage] !== undefined;
}

export function weightedAmount(amount: number, stage: ProjectStage): number {
  const weight = STAGE_WEIGHT_PERCENT[stage];
  if (weight === undefined) throw new Error(`Stage "${stage}" does not accept backing.`);
  return Math.floor((amount * weight) / 100);
}

/** Kudos that are (or were) really committed: everything not thawed back to the backer. */
export function netAmount(b: { amount: number; refunded: number }): number {
  return Math.max(0, b.amount - b.refunded);
}

/** Cold Kudos still locked in a backing. */
export function lockedAmount(b: { amount: number; released: number; refunded: number }): number {
  return Math.max(0, b.amount - b.released - b.refunded);
}

export function returnCapFor(b: { amount: number; refunded?: number }, returnCapPercent: number): number {
  return Math.floor((netAmount({ amount: b.amount, refunded: b.refunded ?? 0 }) * returnCapPercent) / 100);
}

// ── Weekly allowance ─────────────────────────────────────────────────────────

export type AllowanceStatus =
  | { claimable: true }
  | { claimable: false; reason: "balance_ceiling" }
  | { claimable: false; reason: "too_soon"; nextClaimAt: Date };

export function weeklyAllowanceStatus(
  hotBalance: number,
  lastClaimedAt: Date | null,
  now: Date = new Date(),
): AllowanceStatus {
  if (lastClaimedAt) {
    const next = lastClaimedAt.getTime() + KUDOS.WEEKLY_ALLOWANCE_INTERVAL_MS;
    if (now.getTime() < next) return { claimable: false, reason: "too_soon", nextClaimAt: new Date(next) };
  }
  if (hotBalance >= KUDOS.WEEKLY_ALLOWANCE_BALANCE_CEILING) {
    return { claimable: false, reason: "balance_ceiling" };
  }
  return { claimable: true };
}

// ── Releases (Cold → creator Hot) ────────────────────────────────────────────

export type BackingState = {
  id: string;
  amount: number;
  weightedAmount: number;
  released: number;
  refunded: number;
  returned: number;
};

/** Sum of release percentages of delivered milestones, clamped to 100. */
export function deliveredPercent(milestones: Array<{ releasePercent: number; deliveredAt: Date | null }>): number {
  const total = milestones
    .filter((m) => m.deliveredAt)
    .reduce((sum, m) => sum + m.releasePercent, 0);
  return Math.min(100, Math.max(0, total));
}

/**
 * How much of each backing to release when the cumulative delivered percentage is `percent`.
 * A backing releases `floor(net × percent / 100)` in total (net = amount − refunded), never more
 * than is still locked.
 */
export function computeReleases(backings: BackingState[], percent: number): Array<{ id: string; release: number }> {
  const p = Math.min(100, Math.max(0, percent));
  return backings
    .map((b) => {
      const net = netAmount(b);
      const target = p >= 100 ? net : Math.floor((net * p) / 100);
      const release = Math.min(lockedAmount(b), Math.max(0, target - b.released));
      return { id: b.id, release };
    })
    .filter((r) => r.release > 0);
}

// ── Returns (incoming project Kudos → backers) ───────────────────────────────

export type ReturnSplit = {
  creatorAmount: number;
  portions: Array<{ id: string; amount: number }>;
};

/**
 * Split Kudos a project receives between its backers and its creator.
 * Backers who hit their cap stop earning. Rounding goes to the creator.
 */
export function splitIncomingKudos(
  incoming: number,
  backings: BackingState[],
  backerSharePercent: number,
  returnCapPercent: number,
): ReturnSplit {
  if (incoming <= 0) return { creatorAmount: 0, portions: [] };
  const share = Math.min(KUDOS.BACKER_SHARE_MAX_PERCENT, Math.max(0, backerSharePercent));
  const pool = Math.floor((incoming * share) / 100);

  const eligible = backings
    .map((b) => ({ b, headroom: returnCapFor(b, returnCapPercent) - b.returned }))
    .filter(({ b, headroom }) => headroom > 0 && b.weightedAmount > 0 && netAmount(b) > 0);
  const totalWeight = eligible.reduce((sum, { b }) => sum + b.weightedAmount, 0);

  if (pool <= 0 || totalWeight <= 0) return { creatorAmount: incoming, portions: [] };

  const portions = eligible
    .map(({ b, headroom }) => ({
      id: b.id,
      amount: Math.min(headroom, Math.floor((pool * b.weightedAmount) / totalWeight)),
    }))
    .filter((p) => p.amount > 0);

  const paid = portions.reduce((sum, p) => sum + p.amount, 0);
  return { creatorAmount: incoming - paid, portions };
}

/**
 * Weight a backing keeps after `refund` Kudos thaw back to the backer: only the share of the
 * weight that belongs to Kudos still committed survives, so a withdraw-and-rejoin can't keep
 * an early stage weight it no longer pays for.
 */
export function weightAfterRefund(b: { amount: number; refunded: number; weightedAmount: number }, refund: number): number {
  const before = netAmount(b);
  if (before <= 0) return 0;
  const after = Math.max(0, before - refund);
  return Math.floor((b.weightedAmount * after) / before);
}

// ── Change of heart ──────────────────────────────────────────────────────────

export function canWithdrawBacking(
  b: { released: number; refunded: number; amount: number; lastToppedUpAt: Date },
  now: Date = new Date(),
): boolean {
  return (
    b.released === 0 &&
    lockedAmount(b) > 0 &&
    now.getTime() - b.lastToppedUpAt.getTime() <= KUDOS.CHANGE_OF_HEART_MS
  );
}

// ── Milestone plans ──────────────────────────────────────────────────────────

export function validateMilestonePlan(milestones: Array<{ releasePercent: number }>): string | null {
  if (milestones.length > KUDOS.MAX_MILESTONES) return `A project can have at most ${KUDOS.MAX_MILESTONES} milestones.`;
  if (milestones.some((m) => !Number.isInteger(m.releasePercent) || m.releasePercent < 0 || m.releasePercent > 100)) {
    return "Each milestone releases between 0% and 100%.";
  }
  const total = milestones.reduce((sum, m) => sum + m.releasePercent, 0);
  if (total > 100) return "Milestone releases add up to more than 100%.";
  return null;
}

// ── Discovery ────────────────────────────────────────────────────────────────

/**
 * Momentum used by the "Rising" mode: distinct recent supporters, damped for creators who
 * already have a large base so newer voices can surface.
 */
export function risingScore(recentDistinctSupporters: number, creatorTotalSupporters: number): number {
  if (recentDistinctSupporters <= 0) return 0;
  return recentDistinctSupporters / Math.sqrt(1 + creatorTotalSupporters / 10);
}
