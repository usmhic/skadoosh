import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, and, or, ilike, isNotNull, ne, sql, gt } from "drizzle-orm";
import { db, follow, portfolioProfiles, project, projectBacking, projectContributor, user, userSettings, work } from "@skaddosh/db";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { reputationFor } from "../lib/reputation";
import { projectCard } from "../lib/project-view";
import {
  defaultContentFor,
  getPortfolioGallery,
  getPortfolioProjects,
  parseMetadata,
} from "./portfolios";

function parseWork(w: typeof work.$inferSelect) {
  return {
    ...w,
    title: JSON.parse(w.titleJson) as Record<string,string>,
    tag: JSON.parse(w.tagJson) as Record<string,string>,
    summary: JSON.parse(w.summaryJson) as Record<string,string>,
  };
}

async function portfolioSummary(
  profile: typeof portfolioProfiles.$inferSelect | undefined,
  owner: { name: string; email?: string | null; username?: string | null; location?: string | null; website?: string | null; bio?: string | null },
  viewerId: string | null | undefined,
) {
  if (!profile?.published) return null;

  const fallback = defaultContentFor({
    name: profile.displayName || owner.name,
    email: owner.email,
    username: profile.username || owner.username || "portfolio",
    prompt: profile.prompt,
    location: owner.location,
    website: owner.website,
    bio: owner.bio,
  });
  const { content } = parseMetadata(profile.metadata, fallback);
  const highlighting = content.highlighting;

  return {
    username: profile.username,
    displayName: profile.displayName,
    prompt: profile.prompt,
    profileType: profile.profileType ?? "individual",
    projects: await getPortfolioProjects(
      profile.userId,
      highlighting.projectIds.length ? highlighting.projectIds : undefined,
      viewerId,
    ),
    gallery: await getPortfolioGallery(
      profile.userId,
      highlighting.galleryIds.length ? highlighting.galleryIds : undefined,
      viewerId,
    ),
  };
}

export const creatorsRouter = router({
  byUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const [creator] = await db.select().from(user).where(eq(user.username, input.username)).limit(1);
      if (!creator) return null;
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, creator.id)).limit(1);
      if (settings?.profilePublic === false) return null;
      const works = await db.select().from(work)
        .where(and(eq(work.creatorId, creator.id), eq(work.published, true)))
        .orderBy(desc(work.createdAt));
      const [portfolio] = await db.select().from(portfolioProfiles)
        .where(eq(portfolioProfiles.userId, creator.id)).limit(1);
      const portfolioEnabled = settings?.portfolioEnabled ?? true;
      const viewerId = ctx.session?.user?.id;
      const creatorRef = {
        name: creator.name,
        username: creator.username,
        image: creator.image,
        verificationStatus: creator.verificationStatus,
      };
      const [reputation, projects, believesIn, [followers], viewerFollow, contributesTo] = await Promise.all([
        reputationFor(creator.id),
        db
          .select()
          .from(project)
          .where(and(eq(project.creatorId, creator.id), eq(project.status, "published"), ne(project.stage, "cancelled")))
          .orderBy(desc(project.updatedAt)),
        db
          .select({
            p: project,
            owner: { name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus },
            backerNumber: projectBacking.backerNumber,
            stageAtBacking: projectBacking.stageAtBacking,
          })
          .from(projectBacking)
          .innerJoin(project, eq(project.id, projectBacking.projectId))
          .innerJoin(user, eq(user.id, project.creatorId))
          .where(
            and(
              eq(projectBacking.backerId, creator.id),
              gt(projectBacking.amount, projectBacking.refunded),
              eq(project.status, "published"),
            ),
          )
          .orderBy(desc(projectBacking.createdAt))
          .limit(24),
        db.select({ n: sql<number>`count(*)::int` }).from(follow).where(eq(follow.creatorId, creator.id)),
        viewerId
          ? db
              .select({ creatorId: follow.creatorId })
              .from(follow)
              .where(and(eq(follow.followerId, viewerId), eq(follow.creatorId, creator.id)))
              .limit(1)
          : Promise.resolve([]),
        db
          .select({
            p: project,
            owner: { name: user.name, username: user.username, image: user.image, verificationStatus: user.verificationStatus },
            role: projectContributor.role,
          })
          .from(projectContributor)
          .innerJoin(project, eq(project.id, projectContributor.projectId))
          .innerJoin(user, eq(user.id, project.creatorId))
          .where(
            and(
              eq(projectContributor.userId, creator.id),
              eq(projectContributor.status, "accepted"),
              eq(project.status, "published"),
            ),
          )
          .limit(24),
      ]);
      return {
        reputation,
        verified: creator.verificationStatus === "verified",
        contributesTo: contributesTo.map((row) => ({ ...projectCard(row.p, row.owner), role: row.role })),
        followers: followers?.n ?? 0,
        viewer: { following: viewerFollow.length > 0, isSelf: viewerId === creator.id },
        projects: projects.map((p) => projectCard(p, creatorRef)),
        believesIn: believesIn.map((row) => ({
          ...projectCard(row.p, row.owner),
          backerNumber: row.backerNumber,
          earlyBeliever: row.stageAtBacking === "idea",
        })),
        creator: {
          id: creator.id,
          name: creator.name,
          username: creator.username,
          bio: creator.bio,
          website: creator.website,
          location: creator.location,
          image: creator.image,
        },
        works: works.map(parseWork),
        settings: {
          portfolioEnabled,
        },
        portfolio: portfolioEnabled ? await portfolioSummary(portfolio, creator, viewerId) : null,
      };
    }),

  follow: protectedProcedure
    .input(z.object({ creatorId: z.string(), following: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.session.user.id;
      if (followerId === input.creatorId) throw new TRPCError({ code: "BAD_REQUEST", message: "You can't follow yourself." });
      if (input.following) {
        await db.insert(follow).values({ followerId, creatorId: input.creatorId }).onConflictDoNothing();
      } else {
        await db.delete(follow).where(and(eq(follow.followerId, followerId), eq(follow.creatorId, input.creatorId)));
      }
      return { ok: true, following: input.following };
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(60), limit: z.number().min(1).max(10).default(5) }))
    .query(async ({ input }) => {
      const pattern = `%${input.query}%`;
      const rows = await db.select({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        profilePublic: userSettings.profilePublic,
      })
        .from(user)
        .leftJoin(userSettings, eq(userSettings.userId, user.id))
        .where(and(
          isNotNull(user.username),
          or(ilike(user.name, pattern), ilike(user.username, pattern)),
        ))
        .limit(input.limit * 2);

      return rows
        .filter((r) => r.profilePublic !== false)
        .slice(0, input.limit)
        .map((r) => ({ id: r.id, name: r.name, username: r.username as string, image: r.image }));
    }),
});
