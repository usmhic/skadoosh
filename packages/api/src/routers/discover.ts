import { z } from "zod";
import { and, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  MEDIUMS,
  db,
  follow,
  kudos,
  project,
  projectBacking,
  projectUpdate,
  user,
  userSettings,
  work,
  type Medium,
} from "@skaddosh/db";
import { publicProcedure, router } from "../trpc";
import { risingScore } from "../lib/kudos-economy";
import { projectCard, type ProjectCard } from "../lib/project-view";
import { supporterCounts } from "../lib/reputation";

const DAY = 24 * 60 * 60 * 1000;
const MOMENTUM_WINDOW_DAYS = 14;
const NEW_VOICE_SUPPORTERS = 10;
const CANDIDATES = 150;

export const DISCOVER_MODES = ["for-you", "following", "rising", "backing", "collab", "new-voices"] as const;
export type DiscoverMode = (typeof DISCOVER_MODES)[number];

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type CreatorRef = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  verificationStatus: string | null;
};

function workCard(w: typeof work.$inferSelect, creator: CreatorRef) {
  return {
    kind: "work" as const,
    id: w.id,
    type: w.type,
    title: parseJson<Record<string, string>>(w.titleJson, {}),
    tag: parseJson<Record<string, string>>(w.tagJson, {}),
    image: w.image,
    accentColor: w.accentColor,
    readingTime: w.readingTime,
    kudosCount: w.kudosCount,
    commentsCount: w.commentsCount,
    tags: parseJson<string[]>(w.tagsJson, []),
    confidential: w.visibility === "confidential",
    medium: "writing",
    creator: {
      name: creator.name,
      username: creator.username,
      image: creator.image,
      verified: creator.verificationStatus === "verified",
    },
    createdAt: w.createdAt,
  };
}

export type WorkCard = ReturnType<typeof workCard>;
export type DiscoverItem = (WorkCard | ProjectCard) & {
  /** Distinct supporters in the momentum window. */
  momentum: number;
  /** Optional one-line reason this item appears in the Following feed. */
  activity?: { label: string; body?: string; at: Date };
};

async function loadCandidates() {
  const [works, projects] = await Promise.all([
    db
      .select({ w: work, creator: { id: user.id, name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus } })
      .from(work)
      .innerJoin(user, eq(work.creatorId, user.id))
      .where(and(eq(work.published, true), eq(work.discoverable, true), isNull(work.archivedAt)))
      .orderBy(desc(work.createdAt))
      .limit(CANDIDATES),
    db
      .select({ p: project, creator: { id: user.id, name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus } })
      .from(project)
      .innerJoin(user, eq(project.creatorId, user.id))
      .where(and(eq(project.status, "published"), ne(project.stage, "cancelled")))
      .orderBy(desc(project.updatedAt))
      .limit(CANDIDATES),
  ]);
  return { works, projects };
}

/** Distinct recent supporters per work and per project. */
async function momentum(workIds: string[], projectIds: string[]) {
  const since = new Date(Date.now() - MOMENTUM_WINDOW_DAYS * DAY);
  const [workRows, projectRows] = await Promise.all([
    workIds.length
      ? db
          .select({ id: kudos.workId, n: sql<number>`count(distinct ${kudos.fromUserId})::int` })
          .from(kudos)
          .where(and(inArray(kudos.workId, workIds), gte(kudos.createdAt, since)))
          .groupBy(kudos.workId)
      : Promise.resolve([]),
    projectIds.length
      ? db.execute<{ id: string; n: number }>(sql`
          select project_id as id, count(distinct supporter)::int as n from (
            select ${kudos.projectId} as project_id, ${kudos.fromUserId} as supporter
              from ${kudos}
             where ${kudos.projectId} in ${projectIds} and ${kudos.createdAt} >= ${since.toISOString()}
            union all
            select ${projectBacking.projectId}, ${projectBacking.backerId}
              from ${projectBacking}
             where ${projectBacking.projectId} in ${projectIds} and ${projectBacking.lastToppedUpAt} >= ${since.toISOString()}
          ) s group by project_id
        `)
      : Promise.resolve([]),
  ]);
  const map = new Map<string, number>();
  for (const r of workRows) if (r.id) map.set(r.id, Number(r.n));
  for (const r of projectRows) map.set(r.id, Number(r.n));
  return map;
}

function ageDays(date: Date) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / DAY);
}

async function viewerInterests(viewerId: string | undefined) {
  if (!viewerId) return [];
  const [settings] = await db
    .select({ contentCategories: userSettings.contentCategories })
    .from(userSettings)
    .where(eq(userSettings.userId, viewerId))
    .limit(1);
  return parseJson<string[]>(settings?.contentCategories ?? "[]", []).map((t) => t.toLowerCase());
}

async function rankedFeed(mode: Exclude<DiscoverMode, "following">, medium: Medium | undefined, viewerId?: string) {
  const { works, projects } = await loadCandidates();
  const creatorIds = [...new Set([...works.map((r) => r.creator.id), ...projects.map((r) => r.creator.id)])];
  const [moment, supporters, interests] = await Promise.all([
    momentum(works.map((r) => r.w.id), projects.map((r) => r.p.id)),
    supporterCounts(creatorIds),
    mode === "for-you" ? viewerInterests(viewerId) : Promise.resolve([]),
  ]);

  const creatorOf = new Map<string, string>();
  let items: DiscoverItem[] = [
    ...works.map((r) => {
      creatorOf.set(r.w.id, r.creator.id);
      return { ...workCard(r.w, r.creator), momentum: moment.get(r.w.id) ?? 0 };
    }),
    ...projects.map((r) => {
      creatorOf.set(r.p.id, r.creator.id);
      return { ...projectCard(r.p, r.creator), momentum: moment.get(r.p.id) ?? 0 };
    }),
  ];

  if (medium) items = items.filter((item) => item.medium === medium);
  const creatorSupporters = (item: DiscoverItem) => supporters.get(creatorOf.get(item.id) ?? "") ?? 0;

  switch (mode) {
    case "rising":
      return items
        .map((item) => ({ item, score: risingScore(item.momentum, creatorSupporters(item)) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    case "backing":
      return items
        .filter((item): item is DiscoverItem & ProjectCard =>
          item.kind === "project" && (item.stage === "idea" || item.stage === "making") && item.backingGoal > 0,
        )
        .sort((a, b) => {
          const progress = (i: ProjectCard) => Math.min(1, i.coldKudosTotal / Math.max(1, i.backingGoal));
          return b.momentum + progress(b) * 2 - (a.momentum + progress(a) * 2);
        });
    case "collab":
      return items
        .filter((item) => item.kind === "project" && item.openRoles > 0)
        .sort((a, b) => ageDays(a.kind === "project" ? a.updatedAt : a.createdAt) - ageDays(b.kind === "project" ? b.updatedAt : b.createdAt));
    case "new-voices":
      return items
        .filter((item) => creatorSupporters(item) < NEW_VOICE_SUPPORTERS)
        .sort((a, b) => ageDays(a.createdAt) - ageDays(b.createdAt));
    case "for-you":
    default: {
      const score = (item: DiscoverItem) => {
        const fresh = 10 / (1 + ageDays(item.kind === "project" ? item.updatedAt : item.createdAt) / 7);
        const interest = interests.length && item.tags.some((t) => interests.includes(t.toLowerCase())) ? 3 : 0;
        return item.momentum * 2 + fresh + interest;
      };
      return items.sort((a, b) => score(b) - score(a));
    }
  }
}

/** Updates and new work from creators you follow and projects you back. */
async function followingFeed(viewerId: string): Promise<DiscoverItem[]> {
  const [followed, backed] = await Promise.all([
    db.select({ id: follow.creatorId }).from(follow).where(eq(follow.followerId, viewerId)),
    db
      .select({ id: projectBacking.projectId })
      .from(projectBacking)
      .where(and(eq(projectBacking.backerId, viewerId), sql`${projectBacking.amount} > ${projectBacking.refunded}`)),
  ]);
  const creatorIds = followed.map((f) => f.id);
  const backedIds = backed.map((b) => b.id);
  if (!creatorIds.length && !backedIds.length) return [];

  const projectFilter = [
    creatorIds.length ? inArray(project.creatorId, creatorIds) : undefined,
    backedIds.length ? inArray(project.id, backedIds) : undefined,
  ].filter(Boolean);

  const [works, updates] = await Promise.all([
    creatorIds.length
      ? db
          .select({ w: work, creator: { id: user.id, name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus } })
          .from(work)
          .innerJoin(user, eq(work.creatorId, user.id))
          .where(and(eq(work.published, true), inArray(work.creatorId, creatorIds)))
          .orderBy(desc(work.createdAt))
          .limit(30)
      : Promise.resolve([]),
    db
      .select({
        u: projectUpdate,
        p: project,
        creator: { id: user.id, name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus },
      })
      .from(projectUpdate)
      .innerJoin(project, eq(project.id, projectUpdate.projectId))
      .innerJoin(user, eq(user.id, project.creatorId))
      .where(and(eq(project.status, "published"), or(...projectFilter)))
      .orderBy(desc(projectUpdate.createdAt))
      .limit(40),
  ]);

  const labels: Record<string, string> = {
    process: "Process update",
    milestone: "Milestone delivered",
    stage: "Stage change",
  };
  const items: DiscoverItem[] = [];
  const seenProjects = new Set<string>();
  for (const row of updates) {
    if (seenProjects.has(row.p.id)) continue;
    seenProjects.add(row.p.id);
    items.push({
      ...projectCard(row.p, row.creator),
      momentum: 0,
      activity: { label: labels[row.u.kind] ?? "Update", body: row.u.body.slice(0, 220), at: row.u.createdAt },
    });
  }
  for (const row of works) {
    items.push({ ...workCard(row.w, row.creator), momentum: 0, activity: { label: "New piece", at: row.w.createdAt } });
  }
  return items.sort((a, b) => new Date(b.activity!.at).getTime() - new Date(a.activity!.at).getTime());
}

export const discoverRouter = router({
  feed: publicProcedure
    .input(
      z
        .object({
          mode: z.enum(DISCOVER_MODES).default("for-you"),
          medium: z.enum(MEDIUMS).optional(),
          limit: z.number().int().min(1).max(60).default(36),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const mode = input?.mode ?? "for-you";
      const viewerId = ctx.session?.user?.id;

      if (mode === "following") {
        if (!viewerId) return { mode, items: [] as DiscoverItem[] };
        let items = await followingFeed(viewerId);
        if (input?.medium) items = items.filter((i) => i.medium === input.medium);
        return { mode, items: items.slice(0, input?.limit ?? 36) };
      }

      const items = await rankedFeed(mode, input?.medium, viewerId);
      return { mode, items: items.slice(0, input?.limit ?? 36) };
    }),

  mediums: publicProcedure.query(() => mediumCounts()),
});

/** Medium counts for the gallery filter. */
export async function mediumCounts() {
  const { works, projects } = await loadCandidates();
  const counts = new Map<string, number>();
  counts.set("writing", works.length);
  for (const r of projects) counts.set(r.p.medium, (counts.get(r.p.medium) ?? 0) + 1);
  return MEDIUMS.map((medium) => ({ medium, count: counts.get(medium) ?? 0 }));
}
