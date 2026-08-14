import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, galleryCollection, user } from "@skaddosh/db";
import { router, protectedProcedure, publicProcedure, creatorProcedure } from "../trpc";
import { randomUUID } from "crypto";
import { canViewFull, hasContentAccess } from "../lib/content-access";

const galleryImageSchema = z.object({
  url: z.string(),
  caption: z.string().max(280).optional(),
  alt: z.string().max(200).optional(),
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;

function parseCollection(c: typeof galleryCollection.$inferSelect) {
  return {
    ...c,
    images: JSON.parse(c.images) as GalleryImage[],
  };
}

export const galleryRouter = router({
  publicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ g: galleryCollection, creator: { name: user.name, username: user.username } })
        .from(galleryCollection)
        .innerJoin(user, eq(galleryCollection.creatorId, user.id))
        .where(and(eq(galleryCollection.id, input.id), eq(galleryCollection.status, "published")))
        .limit(1);
      if (!row) return null;

      const viewerId = ctx.session?.user?.id;
      const unlocked =
        canViewFull(row.g, viewerId) || (await hasContentAccess("gallery", row.g.id, viewerId));

      if (!unlocked) {
        return {
          locked: true as const,
          id: row.g.id,
          name: row.g.name,
          description: row.g.description.slice(0, 200),
          coverImage: row.g.coverImage,
          accentColor: row.g.accentColor,
          imageCount: (JSON.parse(row.g.images) as unknown[]).length,
          unlockMethod: row.g.unlockMethod,
          kudosPrice: row.g.kudosPrice,
          creator: row.creator,
        };
      }

      return { locked: false as const, ...parseCollection(row.g), creator: row.creator };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(galleryCollection)
      .where(eq(galleryCollection.creatorId, ctx.session.user.id))
      .orderBy(desc(galleryCollection.updatedAt));
    return rows.map(parseCollection);
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(galleryCollection)
        .where(
          and(
            eq(galleryCollection.id, input.id),
            eq(galleryCollection.creatorId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return parseCollection(row);
    }),

  create: creatorProcedure
    .input(
      z.object({
        name: z.string().max(200).default(""),
        accentColor: z.string().default("#6366f1"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = `gal_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      await db.insert(galleryCollection).values({
        id,
        creatorId: ctx.session.user.id,
        name: input.name,
        description: "",
        status: "draft",
        accentColor: input.accentColor,
        images: "[]",
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(200).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        coverImage: z.string().nullable().optional(),
        images: z.array(galleryImageSchema).max(80).optional(),
        accentColor: z.string().optional(),
        visibility: z.enum(["public", "confidential"]).optional(),
        unlockMethod: z.enum(["request", "kudos"]).optional(),
        kudosPrice: z.number().int().min(0).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(galleryCollection)
        .where(
          and(
            eq(galleryCollection.id, input.id),
            eq(galleryCollection.creatorId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(galleryCollection)
        .set({
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          status: input.status ?? existing.status,
          coverImage: input.coverImage !== undefined ? input.coverImage : existing.coverImage,
          images:
            input.images !== undefined ? JSON.stringify(input.images) : existing.images,
          accentColor: input.accentColor ?? existing.accentColor,
          visibility: input.visibility ?? existing.visibility,
          unlockMethod: input.unlockMethod ?? existing.unlockMethod,
          kudosPrice: input.kudosPrice ?? existing.kudosPrice,
          updatedAt: new Date(),
        })
        .where(eq(galleryCollection.id, input.id));

      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(galleryCollection)
        .where(
          and(
            eq(galleryCollection.id, input.id),
            eq(galleryCollection.creatorId, ctx.session.user.id),
          ),
        );
      return { ok: true };
    }),
});
