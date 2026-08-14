import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, savedItem, work, project, galleryCollection } from "@skaddosh/db";
import { protectedProcedure, router } from "../trpc";

const contentTypeSchema = z.enum(["work", "project", "gallery"]);

export const savedRouter = router({
  toggle: protectedProcedure
    .input(z.object({ contentType: contentTypeSchema, contentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(savedItem)
        .where(
          and(
            eq(savedItem.userId, ctx.session.user.id),
            eq(savedItem.contentType, input.contentType),
            eq(savedItem.contentId, input.contentId),
          ),
        )
        .limit(1);

      if (existing) {
        await db.delete(savedItem).where(eq(savedItem.id, existing.id));
        return { saved: false };
      }

      await db.insert(savedItem).values({
        userId: ctx.session.user.id,
        contentType: input.contentType,
        contentId: input.contentId,
        createdAt: new Date(),
      });
      return { saved: true };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(savedItem)
      .where(eq(savedItem.userId, ctx.session.user.id))
      .orderBy(desc(savedItem.createdAt));

    const workIds = rows.filter((r) => r.contentType === "work").map((r) => r.contentId);
    const projectIds = rows.filter((r) => r.contentType === "project").map((r) => r.contentId);
    const galleryIds = rows.filter((r) => r.contentType === "gallery").map((r) => r.contentId);

    const [works, projects, galleries] = await Promise.all([
      workIds.length ? db.select().from(work).where(inArray(work.id, workIds)) : [],
      projectIds.length ? db.select().from(project).where(inArray(project.id, projectIds)) : [],
      galleryIds.length ? db.select().from(galleryCollection).where(inArray(galleryCollection.id, galleryIds)) : [],
    ]);

    const workById = new Map(works.map((w) => [w.id, w]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const galleryById = new Map(galleries.map((g) => [g.id, g]));

    return rows
      .map((r) => {
        if (r.contentType === "work") {
          const w = workById.get(r.contentId);
          if (!w) return null;
          return {
            contentType: "work" as const,
            savedAt: r.createdAt,
            id: w.id,
            title: (JSON.parse(w.titleJson) as Record<string, string>).en || "Untitled",
            type: w.type,
            accentColor: w.accentColor,
          };
        }
        if (r.contentType === "project") {
          const p = projectById.get(r.contentId);
          if (!p) return null;
          return {
            contentType: "project" as const,
            savedAt: r.createdAt,
            id: p.id,
            title: p.title || "Untitled project",
            accentColor: p.accentColor,
            coverImage: p.coverImage,
          };
        }
        const g = galleryById.get(r.contentId);
        if (!g) return null;
        return {
          contentType: "gallery" as const,
          savedAt: r.createdAt,
          id: g.id,
          title: g.name || "Untitled collection",
          accentColor: g.accentColor,
          coverImage: g.coverImage,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }),
});
