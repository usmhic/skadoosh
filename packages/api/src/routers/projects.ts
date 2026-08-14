import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, project, user } from "@skaddosh/db";
import { router, protectedProcedure, publicProcedure, creatorProcedure } from "../trpc";
import { randomUUID } from "crypto";
import { canViewFull, hasContentAccess } from "../lib/content-access";

function parseProject(p: typeof project.$inferSelect) {
  return {
    ...p,
    images: JSON.parse(p.images) as string[],
    tags: JSON.parse(p.tags) as string[],
  };
}

export const projectsRouter = router({
  publicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ p: project, creator: { name: user.name, username: user.username } })
        .from(project)
        .innerJoin(user, eq(project.creatorId, user.id))
        .where(and(eq(project.id, input.id), eq(project.status, "published")))
        .limit(1);
      if (!row) return null;

      const viewerId = ctx.session?.user?.id;
      const unlocked =
        canViewFull(row.p, viewerId) || (await hasContentAccess("project", row.p.id, viewerId));

      if (!unlocked) {
        return {
          locked: true as const,
          id: row.p.id,
          title: row.p.title,
          description: row.p.description.slice(0, 200),
          coverImage: row.p.coverImage,
          accentColor: row.p.accentColor,
          tags: JSON.parse(row.p.tags) as string[],
          unlockMethod: row.p.unlockMethod,
          kudosPrice: row.p.kudosPrice,
          creator: row.creator,
        };
      }

      return { locked: false as const, ...parseProject(row.p), creator: row.creator };
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
      const [row] = await db
        .select()
        .from(project)
        .where(and(eq(project.id, input.id), eq(project.creatorId, ctx.session.user.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return parseProject(row);
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(project)
        .where(and(eq(project.id, input.id), eq(project.creatorId, ctx.session.user.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(project)
        .set({
          title: input.title ?? existing.title,
          description: input.description ?? existing.description,
          status: input.status ?? existing.status,
          coverImage: input.coverImage !== undefined ? input.coverImage : existing.coverImage,
          images: input.images !== undefined ? JSON.stringify(input.images) : existing.images,
          url: input.url !== undefined ? input.url : existing.url,
          repoUrl: input.repoUrl !== undefined ? input.repoUrl : existing.repoUrl,
          tags: input.tags !== undefined ? JSON.stringify(input.tags) : existing.tags,
          accentColor: input.accentColor ?? existing.accentColor,
          visibility: input.visibility ?? existing.visibility,
          unlockMethod: input.unlockMethod ?? existing.unlockMethod,
          kudosPrice: input.kudosPrice ?? existing.kudosPrice,
          updatedAt: new Date(),
        })
        .where(eq(project.id, input.id));

      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(project)
        .where(and(eq(project.id, input.id), eq(project.creatorId, ctx.session.user.id)));
      return { ok: true };
    }),
});
