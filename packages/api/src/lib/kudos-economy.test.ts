import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KUDOS,
  acceptsBacking,
  canWithdrawBacking,
  weightAfterRefund,
  computeReleases,
  deliveredPercent,
  lockedAmount,
  risingScore,
  splitIncomingKudos,
  validateMilestonePlan,
  weeklyAllowanceStatus,
  weightedAmount,
  type BackingState,
} from "./kudos-economy";

const backing = (overrides: Partial<BackingState> & { id: string }): BackingState => ({
  amount: 0,
  weightedAmount: 0,
  released: 0,
  refunded: 0,
  returned: 0,
  ...overrides,
});

describe("stage weights", () => {
  it("weights early backing more", () => {
    assert.equal(weightedAmount(40, "idea"), 60);
    assert.equal(weightedAmount(40, "making"), 50);
  });

  it("only idea and making accept backing", () => {
    assert.equal(acceptsBacking("idea"), true);
    assert.equal(acceptsBacking("making"), true);
    assert.equal(acceptsBacking("released"), false);
    assert.equal(acceptsBacking("cancelled"), false);
    assert.throws(() => weightedAmount(10, "released"));
  });
});

describe("weekly allowance", () => {
  const now = new Date("2026-10-07T12:00:00Z");

  it("is claimable on first claim under the ceiling", () => {
    assert.deepEqual(weeklyAllowanceStatus(20, null, now), { claimable: true });
  });

  it("waits seven days between claims", () => {
    const last = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const status = weeklyAllowanceStatus(20, last, now);
    assert.equal(status.claimable, false);
    assert.equal(status.claimable === false && status.reason, "too_soon");
  });

  it("stops once the balance reaches the ceiling", () => {
    const status = weeklyAllowanceStatus(KUDOS.WEEKLY_ALLOWANCE_BALANCE_CEILING, null, now);
    assert.deepEqual(status, { claimable: false, reason: "balance_ceiling" });
  });
});

describe("releases", () => {
  it("sums delivered milestones only", () => {
    assert.equal(
      deliveredPercent([
        { releasePercent: 30, deliveredAt: new Date() },
        { releasePercent: 30, deliveredAt: null },
        { releasePercent: 40, deliveredAt: new Date() },
      ]),
      70,
    );
  });

  it("releases cumulatively and catches up late backers", () => {
    const backings = [
      backing({ id: "early", amount: 100, released: 30 }), // already received the 30% release
      backing({ id: "late", amount: 50 }), // joined after the first milestone
    ];
    assert.deepEqual(computeReleases(backings, 60), [
      { id: "early", release: 30 },
      { id: "late", release: 30 },
    ]);
  });

  it("releases everything still locked at 100%", () => {
    const backings = [backing({ id: "a", amount: 33, released: 9, refunded: 0 })];
    assert.deepEqual(computeReleases(backings, 100), [{ id: "a", release: 24 }]);
  });

  it("computes releases on the net amount after a withdraw and re-back", () => {
    // Backed 20, withdrew 20, backed 20 again: 40 gross, 20 refunded, 20 really committed.
    const rejoined = backing({ id: "rejoined", amount: 40, refunded: 20 });
    assert.deepEqual(computeReleases([rejoined], 40), [{ id: "rejoined", release: 8 }]);
  });

  it("never releases refunded Kudos", () => {
    const backings = [backing({ id: "a", amount: 40, refunded: 40 })];
    assert.deepEqual(computeReleases(backings, 100), []);
    assert.equal(lockedAmount(backings[0]!), 0);
  });
});

describe("returns", () => {
  const amal = backing({ id: "amal", amount: 40, weightedAmount: 60 });
  const theo = backing({ id: "theo", amount: 40, weightedAmount: 50 });

  it("matches the worked example in docs/KUDOS.md", () => {
    assert.deepEqual(splitIncomingKudos(5, [amal, theo], 10, 200), { creatorAmount: 5, portions: [] });
    assert.deepEqual(splitIncomingKudos(50, [amal, theo], 10, 200), {
      creatorAmount: 46,
      portions: [
        { id: "amal", amount: 2 },
        { id: "theo", amount: 2 },
      ],
    });
  });

  it("stops paying a backing at its cap", () => {
    const capped = { ...amal, returned: 80 };
    const split = splitIncomingKudos(1000, [capped, theo], 10, 200);
    // Amal drops out, so Theo takes the whole pool of 100, limited by his own cap of 80.
    assert.deepEqual(split.portions, [{ id: "theo", amount: 80 }]);
    assert.equal(split.creatorAmount, 920);
  });

  it("limits a portion to the remaining headroom", () => {
    const nearlyCapped = { ...amal, returned: 79 };
    const split = splitIncomingKudos(1000, [nearlyCapped], 10, 200);
    assert.deepEqual(split.portions, [{ id: "amal", amount: 1 }]);
    assert.equal(split.creatorAmount, 999);
  });

  it("gives everything to the creator without backers or share", () => {
    assert.deepEqual(splitIncomingKudos(20, [], 10, 200), { creatorAmount: 20, portions: [] });
    assert.deepEqual(splitIncomingKudos(20, [amal], 0, 200), { creatorAmount: 20, portions: [] });
  });

  it("clamps the backer share to the maximum", () => {
    const split = splitIncomingKudos(100, [amal], 90, 300);
    assert.equal(split.portions[0]?.amount, KUDOS.BACKER_SHARE_MAX_PERCENT);
  });

  it("conserves every Kudo", () => {
    for (const incoming of [1, 7, 13, 99, 250]) {
      const split = splitIncomingKudos(incoming, [amal, theo], 25, 200);
      const paid = split.portions.reduce((sum, p) => sum + p.amount, 0);
      assert.equal(split.creatorAmount + paid, incoming);
    }
  });
});

describe("refund weight", () => {
  it("drops all weight on a full withdraw and keeps it proportionally otherwise", () => {
    assert.equal(weightAfterRefund({ amount: 20, refunded: 0, weightedAmount: 30 }, 20), 0);
    assert.equal(weightAfterRefund({ amount: 40, refunded: 0, weightedAmount: 60 }, 30), 15);
  });

  it("caps returns on the net amount", () => {
    const rejoined = backing({ id: "r", amount: 40, refunded: 20, weightedAmount: 25 });
    const split = splitIncomingKudos(10_000, [rejoined], 30, 200);
    assert.deepEqual(split.portions, [{ id: "r", amount: 40 }]);
  });
});

describe("change of heart", () => {
  const now = new Date("2026-10-07T12:00:00Z");

  it("allows withdrawal within 48 hours when nothing is released", () => {
    const lastToppedUpAt = new Date(now.getTime() - 47 * 60 * 60 * 1000);
    assert.equal(canWithdrawBacking({ amount: 20, released: 0, refunded: 0, lastToppedUpAt }, now), true);
  });

  it("refuses after 48 hours or after a release", () => {
    const old = new Date(now.getTime() - 49 * 60 * 60 * 1000);
    assert.equal(canWithdrawBacking({ amount: 20, released: 0, refunded: 0, lastToppedUpAt: old }, now), false);
    assert.equal(canWithdrawBacking({ amount: 20, released: 5, refunded: 0, lastToppedUpAt: now }, now), false);
  });
});

describe("milestone plans", () => {
  it("accepts plans up to 100%", () => {
    assert.equal(validateMilestonePlan([{ releasePercent: 40 }, { releasePercent: 60 }]), null);
  });

  it("rejects over-allocated or oversized plans", () => {
    assert.match(validateMilestonePlan([{ releasePercent: 70 }, { releasePercent: 40 }]) ?? "", /more than 100%/);
    assert.match(
      validateMilestonePlan(Array.from({ length: KUDOS.MAX_MILESTONES + 1 }, () => ({ releasePercent: 1 }))) ?? "",
      /at most/,
    );
  });
});

describe("rising score", () => {
  it("favours smaller creators with the same recent support", () => {
    assert.ok(risingScore(8, 5) > risingScore(8, 500));
    assert.equal(risingScore(0, 0), 0);
  });
});
