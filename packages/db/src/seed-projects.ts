/**
 * Demo projects for the Kudos economy: stages, milestones, backers, process logs, returns,
 * follows, and a ledger that reconciles with every demo user's Hot balance.
 *
 * Every row has a fixed id or a natural unique key, so repeated seeds stay idempotent.
 */
import { eq, inArray, sql } from "drizzle-orm";
import {
  db,
  follow,
  kudos,
  kudosLedger,
  project,
  projectBacking,
  projectMilestone,
  projectUpdate,
  user,
  type AiUsage,
  type ProjectStage,
} from "./index";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

/** Mirrors STAGE_WEIGHT_PERCENT in packages/api/src/lib/kudos-economy.ts. */
const STAGE_WEIGHT: Partial<Record<ProjectStage, number>> = { idea: 150, making: 125 };

type DemoBacking = { backerId: string; amount: number; stage: "idea" | "making"; daysAgo: number; returned?: number };
type DemoMilestone = { title: string; description: string; releasePercent: number; dueInDays?: number; deliveredDaysAgo?: number };
type DemoGift = { fromUserId: string; amount: number; message?: string; daysAgo: number };

type DemoProject = {
  id: string;
  creatorId: string;
  title: string;
  pitch: string;
  description: string;
  stage: ProjectStage;
  accentColor: string;
  tags: string[];
  backingGoal: number;
  backerSharePercent: number;
  returnCapPercent: number;
  openRoles: Array<{ title: string; description: string }>;
  aiUsage: AiUsage[];
  createdDaysAgo: number;
  milestones: DemoMilestone[];
  backings: DemoBacking[];
  updates: Array<{ body: string; daysAgo: number; kind?: "process" | "milestone" | "stage" }>;
  gifts: DemoGift[];
};

const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "proj_salt_atlas",
    creatorId: "user_laila_mansouri",
    title: "Salt Atlas",
    pitch: "A hand-drawn field atlas of Morocco's old salt roads, built from oral histories.",
    description:
      "Salt Atlas follows the caravan routes that carried salt from Taoudenni to the Atlantic, told through the people who still remember them.\n\nI am recording conversations with families in six towns, drawing every map by hand, and pairing each route with a short oral history. The finished atlas will be a 96-page book with 12 illustrated plates and a free online edition.\n\nBackers fund the travel, the plates, and the first print run.",
    stage: "making",
    accentColor: "#c2410c",
    tags: ["research", "archive", "illustration", "cities", "memory"],
    backingGoal: 400,
    backerSharePercent: 10,
    returnCapPercent: 200,
    openRoles: [
      { title: "Illustrator for 12 plates", description: "Ink and watercolour; I'll share field sketches and reference photos." },
      { title: "Arabic → French translator", description: "Six short oral histories, about 4,000 words in total." },
    ],
    aiUsage: ["research"],
    createdDaysAgo: 60,
    milestones: [
      { title: "Field interviews", description: "Six towns, recorded and transcribed.", releasePercent: 30, deliveredDaysAgo: 20 },
      { title: "12 illustrated plates", description: "Final inks for every route.", releasePercent: 40, dueInDays: 30 },
      { title: "Print-ready atlas", description: "Layout, proofing, and the first print run.", releasePercent: 30, dueInDays: 75 },
    ],
    backings: [
      { backerId: "user_ines_ortega", amount: 40, stage: "idea", daysAgo: 55 },
      { backerId: "user_jules_baron", amount: 30, stage: "idea", daysAgo: 52 },
      { backerId: "user_hana_sato", amount: 25, stage: "making", daysAgo: 12 },
      { backerId: "user_salma_idrissi", amount: 60, stage: "making", daysAgo: 6 },
      { backerId: "user_adam_green", amount: 15, stage: "making", daysAgo: 3 },
    ],
    updates: [
      { body: "Back from Tiznit with nine hours of recordings. The salt merchant's daughter remembered every stop on her father's route.", daysAgo: 24 },
      { body: "All six towns recorded and transcribed. First release unlocked. Thank you, early believers.", daysAgo: 20, kind: "milestone" },
      { body: "Plate 3 (the Draa crossing) is inked. Sharing the pencil roughs below with backers first.", daysAgo: 4 },
    ],
    gifts: [
      { fromUserId: "user_nora_vale", amount: 5, message: "The Draa plate is stunning.", daysAgo: 4 },
      { fromUserId: "user_sam_rivera", amount: 3, daysAgo: 2 },
      { fromUserId: "user_mina_park", amount: 4, message: "Would love this in our anthology shop.", daysAgo: 1 },
    ],
  },
  {
    id: "proj_late_trains",
    creatorId: "user_sam_rivera",
    title: "Poems for Late Trains",
    pitch: "A bilingual Spanish–English chapbook of poems written on night trains.",
    description:
      "Twenty-four short poems, each written between two stations after midnight, printed side by side in Spanish and English.\n\nThe chapbook will be risograph-printed in two colours and left on trains across Spain, with a free digital edition here.",
    stage: "idea",
    accentColor: "#4338ca",
    tags: ["poetry", "translation", "zine"],
    backingGoal: 250,
    backerSharePercent: 15,
    returnCapPercent: 200,
    openRoles: [{ title: "Risograph printer", description: "Someone with access to a two-drum riso in Madrid or Valencia." }],
    aiUsage: [],
    createdDaysAgo: 9,
    milestones: [
      { title: "24 poems drafted", description: "Final selection and order.", releasePercent: 40, dueInDays: 20 },
      { title: "Translations finished", description: "Facing-page English versions.", releasePercent: 30, dueInDays: 45 },
      { title: "Printed and left on trains", description: "300 copies.", releasePercent: 30, dueInDays: 70 },
    ],
    backings: [
      { backerId: "user_hana_sato", amount: 20, stage: "idea", daysAgo: 7 },
      { backerId: "user_ines_ortega", amount: 30, stage: "idea", daysAgo: 5 },
    ],
    updates: [{ body: "Eleven poems so far. The best ones keep arriving between Zaragoza and Lleida.", daysAgo: 3 }],
    gifts: [{ fromUserId: "user_jules_baron", amount: 2, daysAgo: 2 }],
  },
  {
    id: "proj_quiet_tools",
    creatorId: "user_nora_vale",
    title: "Quiet Tools",
    pitch: "An essay series and a tiny toolkit for software that leaves you alone.",
    description:
      "Quiet Tools is eight essays on calm software (notifications, defaults, rituals) and a small open-source toolkit that puts the ideas into practice.\n\nIt shipped this summer. Readers who back released projects now support the next edition.",
    stage: "released",
    accentColor: "#0f766e",
    tags: ["essay", "software", "design", "tools"],
    backingGoal: 300,
    backerSharePercent: 10,
    returnCapPercent: 200,
    openRoles: [],
    aiUsage: ["editing", "tools"],
    createdDaysAgo: 140,
    milestones: [
      { title: "First four essays", description: "", releasePercent: 50, deliveredDaysAgo: 90 },
      { title: "Toolkit 1.0 and final essays", description: "", releasePercent: 50, deliveredDaysAgo: 40 },
    ],
    backings: [
      { backerId: "user_jules_baron", amount: 50, stage: "idea", daysAgo: 135, returned: 4 },
      { backerId: "user_adam_green", amount: 25, stage: "idea", daysAgo: 130, returned: 2 },
      { backerId: "user_salma_idrissi", amount: 40, stage: "making", daysAgo: 100, returned: 3 },
    ],
    updates: [
      { body: "Essay four, 'The Default Is a Promise', is live. Release one is out to backers.", daysAgo: 90, kind: "milestone" },
      { body: "Toolkit 1.0 shipped with all eight essays. Thank you for believing in this when it was a sketch.", daysAgo: 40, kind: "milestone" },
      { body: "Released.", daysAgo: 39, kind: "stage" },
      { body: "Working notes for edition two: a chapter on silence in group chats.", daysAgo: 8 },
    ],
    gifts: [
      { fromUserId: "user_omar_haddad", amount: 5, message: "Using the toolkit at work now.", daysAgo: 10 },
      { fromUserId: "user_hana_sato", amount: 5, daysAgo: 9 },
      { fromUserId: "user_ines_ortega", amount: 4, daysAgo: 6 },
      { fromUserId: "user_mina_park", amount: 5, daysAgo: 2 },
    ],
  },
  {
    id: "proj_bureau_lost_forms",
    creatorId: "user_yanis_benali",
    title: "The Bureau of Lost Forms",
    pitch: "A 12-minute satirical short about the office that processes forms nobody filed.",
    description:
      "A clerk inherits a drawer of applications that were never submitted, and starts approving them.\n\nThe script is finished. Backing funds a storyboard, a table read with real actors, and a pitch-ready proof of concept.",
    stage: "making",
    accentColor: "#7c2d12",
    tags: ["script", "satire", "film", "short-film"],
    backingGoal: 500,
    backerSharePercent: 12,
    returnCapPercent: 250,
    openRoles: [
      { title: "Storyboard artist", description: "About 40 panels, loose and fast is perfect." },
      { title: "Composer", description: "Two minutes of bureaucratic waltz." },
    ],
    aiUsage: [],
    createdDaysAgo: 30,
    milestones: [
      { title: "Locked script", description: "", releasePercent: 20, deliveredDaysAgo: 18 },
      { title: "Storyboard", description: "", releasePercent: 40, dueInDays: 25 },
      { title: "Table read and proof of concept", description: "", releasePercent: 40, dueInDays: 60 },
    ],
    backings: [
      { backerId: "user_salma_idrissi", amount: 80, stage: "making", daysAgo: 16 },
      { backerId: "user_ines_ortega", amount: 20, stage: "making", daysAgo: 4 },
    ],
    updates: [{ body: "Script locked at 14 pages. The stamp scene finally works.", daysAgo: 18, kind: "milestone" }],
    gifts: [{ fromUserId: "user_adam_green", amount: 3, daysAgo: 5 }],
  },
  {
    id: "proj_zellige_type",
    creatorId: "user_omar_haddad",
    title: "Zellige Type",
    pitch: "An open-source Latin + Arabic typeface built from zellige geometry.",
    description:
      "Every glyph starts from the eight-point star grid used in zellige tilework. The family will ship in three weights with full Latin and Arabic coverage under the OFL.",
    stage: "making",
    accentColor: "#1d4ed8",
    tags: ["type-design", "design", "visual", "tools"],
    backingGoal: 350,
    backerSharePercent: 10,
    returnCapPercent: 200,
    openRoles: [{ title: "Arabic type consultant", description: "Review of joining behaviour and kashida." }],
    aiUsage: ["tools"],
    createdDaysAgo: 45,
    milestones: [
      { title: "Latin regular", description: "", releasePercent: 35, deliveredDaysAgo: 11 },
      { title: "Arabic regular", description: "", releasePercent: 35, dueInDays: 40 },
      { title: "Three weights + release", description: "", releasePercent: 30, dueInDays: 90 },
    ],
    backings: [
      { backerId: "user_adam_green", amount: 30, stage: "idea", daysAgo: 42 },
      { backerId: "user_hana_sato", amount: 40, stage: "making", daysAgo: 9 },
    ],
    updates: [
      { body: "Latin regular is done: 312 glyphs. Specimen attached.", daysAgo: 11, kind: "milestone" },
      { body: "Started the Arabic. The star grid fights the baseline in interesting ways.", daysAgo: 2 },
    ],
    gifts: [
      { fromUserId: "user_nora_vale", amount: 3, daysAgo: 8 },
      { fromUserId: "user_laila_mansouri", amount: 5, message: "Want to use this for Salt Atlas labels.", daysAgo: 3 },
    ],
  },
  {
    id: "proj_night_shift",
    creatorId: "user_mina_park",
    title: "Night Shift Anthology",
    pitch: "Short fiction by first-time writers who work while everyone else sleeps.",
    description:
      "An open call for stories from nurses, bakers, drivers, and guards. Twelve stories will be edited, paid, and published together.",
    stage: "idea",
    accentColor: "#6d28d9",
    tags: ["fiction", "short-fiction", "publishing"],
    backingGoal: 600,
    backerSharePercent: 10,
    returnCapPercent: 200,
    openRoles: [
      { title: "Copy editor", description: "Twelve stories, 2,000–5,000 words each." },
      { title: "Cover illustrator", description: "One cover, night palette." },
    ],
    aiUsage: [],
    createdDaysAgo: 5,
    milestones: [
      { title: "Open call closes", description: "", releasePercent: 20, dueInDays: 30 },
      { title: "Twelve stories edited", description: "", releasePercent: 50, dueInDays: 90 },
      { title: "Anthology published", description: "", releasePercent: 30, dueInDays: 120 },
    ],
    backings: [{ backerId: "user_jules_baron", amount: 20, stage: "idea", daysAgo: 2 }],
    updates: [{ body: "The open call is live. First submission came from a lighthouse keeper.", daysAgo: 1 }],
    gifts: [],
  },
  {
    id: "proj_two_shores",
    creatorId: "user_al_hishu",
    title: "Two Shores",
    pitch: "Audio stories recorded on the ferries between Tangier and Tarifa.",
    description:
      "Short stories read aloud on the crossing, with the sea, the engines, and the passengers in the background. Season one is out, and season two is recorded as the crossings happen.",
    stage: "sustaining",
    accentColor: "#0e7490",
    tags: ["sound", "audio", "fiction", "field-recording"],
    backingGoal: 0,
    backerSharePercent: 15,
    returnCapPercent: 200,
    openRoles: [],
    aiUsage: [],
    createdDaysAgo: 200,
    milestones: [{ title: "Season one", description: "Eight episodes.", releasePercent: 100, deliveredDaysAgo: 120 }],
    backings: [
      { backerId: "user_ines_ortega", amount: 30, stage: "idea", daysAgo: 190, returned: 7 },
      { backerId: "user_salma_idrissi", amount: 50, stage: "idea", daysAgo: 185, returned: 11 },
    ],
    updates: [
      { body: "Season one is complete.", daysAgo: 120, kind: "milestone" },
      { body: "Season two, episode one: recorded in a storm. Kept the thunder.", daysAgo: 6 },
    ],
    gifts: [
      { fromUserId: "user_hana_sato", amount: 5, daysAgo: 11 },
      { fromUserId: "user_jules_baron", amount: 5, daysAgo: 5 },
    ],
  },
];

const DEMO_FOLLOWS: Array<[follower: string, creator: string]> = [
  ["user_ines_ortega", "user_laila_mansouri"],
  ["user_ines_ortega", "user_sam_rivera"],
  ["user_jules_baron", "user_nora_vale"],
  ["user_jules_baron", "user_mina_park"],
  ["user_hana_sato", "user_omar_haddad"],
  ["user_hana_sato", "user_al_hishu"],
  ["user_adam_green", "user_omar_haddad"],
  ["user_salma_idrissi", "user_yanis_benali"],
  ["user_nora_vale", "user_laila_mansouri"],
];

function cumulativeReleasePercent(p: DemoProject) {
  if (p.stage === "released" || p.stage === "sustaining") return 100;
  return Math.min(100, p.milestones.filter((m) => m.deliveredDaysAgo !== undefined).reduce((s, m) => s + m.releasePercent, 0));
}

export async function insertDemoProjects() {
  for (const p of DEMO_PROJECTS) {
    const releasePercent = cumulativeReleasePercent(p);
    const received = p.gifts.reduce((s, g) => s + g.amount, 0);
    const committed = p.backings.reduce((s, b) => s + b.amount, 0);

    const inserted = await db
      .insert(project)
      .values({
        id: p.id,
        creatorId: p.creatorId,
        title: p.title,
        pitch: p.pitch,
        description: p.description,
        status: "published",
        stage: p.stage,
        accentColor: p.accentColor,
        images: "[]",
        tags: JSON.stringify(p.tags),
        backingGoal: p.backingGoal,
        backerSharePercent: p.backerSharePercent,
        returnCapPercent: p.returnCapPercent,
        coldKudosTotal: committed,
        backersCount: p.backings.length,
        kudosReceived: received,
        openRolesJson: JSON.stringify(p.openRoles),
        aiUsageJson: JSON.stringify(p.aiUsage),
        humanMadeConfirmedAt: daysAgo(p.createdDaysAgo),
        createdAt: daysAgo(p.createdDaysAgo),
        updatedAt: daysAgo(Math.min(...p.updates.map((u) => u.daysAgo), p.createdDaysAgo)),
      })
      .onConflictDoNothing()
      .returning({ id: project.id });
    if (inserted.length === 0) continue; // already seeded

    const milestoneIds: string[] = [];
    for (const [index, m] of p.milestones.entries()) {
      const id = `${p.id}_m${index + 1}`;
      milestoneIds.push(id);
      await db.insert(projectMilestone).values({
        id,
        projectId: p.id,
        position: index,
        title: m.title,
        description: m.description,
        releasePercent: m.releasePercent,
        dueAt: m.dueInDays !== undefined ? daysAgo(-m.dueInDays) : null,
        deliveredAt: m.deliveredDaysAgo !== undefined ? daysAgo(m.deliveredDaysAgo) : null,
        createdAt: daysAgo(p.createdDaysAgo),
      });
    }

    let totalReleased = 0;
    for (const [index, b] of p.backings.entries()) {
      const released = releasePercent >= 100 ? b.amount : Math.floor((b.amount * releasePercent) / 100);
      totalReleased += released;
      await db.insert(projectBacking).values({
        id: `${p.id}_b${index + 1}`,
        projectId: p.id,
        backerId: b.backerId,
        backerNumber: index + 1,
        stageAtBacking: b.stage,
        amount: b.amount,
        weightedAmount: Math.floor((b.amount * (STAGE_WEIGHT[b.stage] ?? 100)) / 100),
        released,
        returned: b.returned ?? 0,
        createdAt: daysAgo(b.daysAgo),
        lastToppedUpAt: daysAgo(b.daysAgo),
      });
      const ref = { projectId: p.id, counterpartyId: p.creatorId, createdAt: daysAgo(b.daysAgo) };
      await db.insert(kudosLedger).values([
        { id: `ledger_${p.id}_b${index + 1}_hot`, userId: b.backerId, currency: "hot", delta: -b.amount, kind: "back", ...ref },
        { id: `ledger_${p.id}_b${index + 1}_cold`, userId: b.backerId, currency: "cold", delta: b.amount, kind: "back", ...ref },
      ]);
      if (released > 0) {
        await db.insert(kudosLedger).values({
          id: `ledger_${p.id}_b${index + 1}_release`,
          userId: b.backerId,
          currency: "cold",
          delta: -released,
          kind: "release",
          ...ref,
        });
      }
      if (b.returned) {
        await db.insert(kudosLedger).values({
          id: `ledger_${p.id}_b${index + 1}_return`,
          userId: b.backerId,
          currency: "hot",
          delta: b.returned,
          kind: "return",
          projectId: p.id,
          createdAt: daysAgo(5),
        });
      }
    }
    if (totalReleased > 0) {
      await db.insert(kudosLedger).values({
        id: `ledger_${p.id}_release_creator`,
        userId: p.creatorId,
        currency: "hot",
        delta: totalReleased,
        kind: "release",
        projectId: p.id,
        createdAt: daysAgo(Math.min(...p.milestones.map((m) => m.deliveredDaysAgo ?? Infinity), p.createdDaysAgo)),
      });
    }

    const returnsPaid = p.backings.reduce((s, b) => s + (b.returned ?? 0), 0);
    for (const [index, g] of p.gifts.entries()) {
      const id = `${p.id}_g${index + 1}`;
      await db.insert(kudos).values({
        id,
        projectId: p.id,
        fromUserId: g.fromUserId,
        amount: g.amount,
        message: g.message ?? null,
        createdAt: daysAgo(g.daysAgo),
      });
      await db.insert(kudosLedger).values([
        { id: `ledger_${id}_give`, userId: g.fromUserId, currency: "hot", delta: -g.amount, kind: "give", projectId: p.id, counterpartyId: p.creatorId, createdAt: daysAgo(g.daysAgo) },
        // The creator's side of the gift; backer returns are taken from the first gifts.
        { id: `ledger_${id}_receive`, userId: p.creatorId, currency: "hot", delta: g.amount - (index === 0 ? returnsPaid : 0), kind: "receive", projectId: p.id, counterpartyId: g.fromUserId, createdAt: daysAgo(g.daysAgo) },
      ]);
    }

    for (const [index, u] of p.updates.entries()) {
      const kind = u.kind ?? "process";
      await db.insert(projectUpdate).values({
        id: `${p.id}_u${index + 1}`,
        projectId: p.id,
        authorId: p.creatorId,
        kind,
        body: u.body,
        createdAt: daysAgo(u.daysAgo),
      });
    }
  }

  for (const [followerId, creatorId] of DEMO_FOLLOWS) {
    await db.insert(follow).values({ followerId, creatorId, createdAt: daysAgo(20) }).onConflictDoNothing();
  }
}

/**
 * Make each demo user's ledger sum to their Hot balance with a single opening entry.
 * Re-running replaces that entry, so the reconciliation stays exact.
 */
export async function reconcileDemoLedger(userIds: string[]) {
  const existing = await db.select({ id: user.id }).from(user).where(inArray(user.id, userIds));
  for (const { id } of existing) {
    const openingId = `ledger_seed_opening_${id}`;
    await db.delete(kudosLedger).where(eq(kudosLedger.id, openingId));
    const [row] = await db
      .select({
        balance: user.kudosBalance,
        ledger: sql<number>`(select coalesce(sum(delta), 0)::int from ${kudosLedger} where ${kudosLedger.userId} = ${id} and ${kudosLedger.currency} = 'hot')`,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!row) continue;
    const delta = row.balance - Number(row.ledger);
    if (delta === 0) continue;
    await db.insert(kudosLedger).values({
      id: openingId,
      userId: id,
      currency: "hot",
      delta,
      kind: "opening_balance",
      createdAt: daysAgo(210),
    });
  }
}

export const DEMO_PROJECT_COUNT = DEMO_PROJECTS.length;
