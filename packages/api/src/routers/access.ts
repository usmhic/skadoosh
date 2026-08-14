import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, contentAccess, work, project, galleryCollection, user } from "@skaddosh/db";
import { protectedProcedure, router } from "../trpc";
import { notifyOwnerInbox } from "./portfolios";

const contentTypeSchema = z.enum(["work", "project", "gallery"]);
type ContentType = z.infer<typeof contentTypeSchema>;

const TABLES = {
  work,
  project,
  gallery: galleryCollection,
} as const;

function titleOf(contentType: ContentType, row: { title?: string; name?: string; titleJson?: string }) {
  if (contentType === "project") return row.title || "Untitled project";
  if (contentType === "gallery") return row.name || "Untitled collection";
  try {
    const title = JSON.parse(row.titleJson ?? "{}") as Record<string, string>;
    return title.en || title.ar || title.fr || title.es || "Untitled work";
  } catch {
    return "Untitled work";
  }
}

async function getContentRow(contentType: ContentType, contentId: string) {
  const table = TABLES[contentType];
  const [row] = await db.select().from(table).where(eq(table.id, contentId)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Content not found." });
  return row;
}

async function getExistingGrant(contentType: ContentType, contentId: string, userId: string) {
  const [row] = await db
    .select()
    .from(contentAccess)
    .where(
      and(
        eq(contentAccess.contentType, contentType),
        eq(contentAccess.contentId, contentId),
        eq(contentAccess.userId, userId),
      ),
    )
    .limit(1);
  return row;
}

export const accessRouter = router({
  request: protectedProcedure
    .input(
      z.object({
        contentType: contentTypeSchema,
        contentId: z.string(),
        message: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await getContentRow(input.contentType, input.contentId);
      if (row.creatorId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already own this content." });
      }
      if (row.visibility !== "confidential") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This content is not confidential." });
      }

      const existing = await getExistingGrant(input.contentType, input.contentId, ctx.session.user.id);
      if (existing?.status === "granted" || existing?.status === "approved") {
        return { ok: true, status: existing.status };
      }

      const now = new Date();
      if (existing) {
        await db
          .update(contentAccess)
          .set({ status: "pending", method: "request", message: input.message ?? null, createdAt: now, decidedAt: null })
          .where(eq(contentAccess.id, existing.id));
      } else {
        await db.insert(contentAccess).values({
          contentType: input.contentType,
          contentId: input.contentId,
          userId: ctx.session.user.id,
          method: "request",
          status: "pending",
          message: input.message ?? null,
          createdAt: now,
        });
      }

      const [requester] = await db.select().from(user).where(eq(user.id, ctx.session.user.id)).limit(1);
      await notifyOwnerInbox(row.creatorId, {
        kind: "access_request",
        subject: `Access request: ${titleOf(input.contentType, row)}`,
        from: { name: requester?.name ?? "A reader", email: requester?.email ?? "" },
        body: input.message?.trim() || "Requested access to your confidential content.",
        meta: { contentType: input.contentType, contentId: input.contentId },
      });

      return { ok: true, status: "pending" };
    }),

  unlockWithKudos: protectedProcedure
    .input(z.object({ contentType: contentTypeSchema, contentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await getContentRow(input.contentType, input.contentId);
      if (row.creatorId === ctx.session.user.id) return { ok: true };
      if (row.visibility !== "confidential") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This content is not confidential." });
      }
      if (row.unlockMethod !== "kudos") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This content is not unlockable with kudos." });
      }

      const existing = await getExistingGrant(input.contentType, input.contentId, ctx.session.user.id);
      if (existing?.status === "granted") return { ok: true };

      const [buyer] = await db.select().from(user).where(eq(user.id, ctx.session.user.id)).limit(1);
      if (!buyer) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (buyer.kudosBalance < row.kudosPrice) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enough kudos balance." });
      }

      await db
        .update(user)
        .set({ kudosBalance: buyer.kudosBalance - row.kudosPrice })
        .where(eq(user.id, buyer.id));

      const now = new Date();
      if (existing) {
        await db
          .update(contentAccess)
          .set({ status: "granted", method: "kudos", kudosSpent: row.kudosPrice, decidedAt: now })
          .where(eq(contentAccess.id, existing.id));
      } else {
        await db.insert(contentAccess).values({
          contentType: input.contentType,
          contentId: input.contentId,
          userId: ctx.session.user.id,
          method: "kudos",
          status: "granted",
          kudosSpent: row.kudosPrice,
          createdAt: now,
          decidedAt: now,
        });
      }

      return { ok: true };
    }),

  decide: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["approved", "denied"]) }))
    .mutation(async ({ ctx, input }) => {
      const [grant] = await db.select().from(contentAccess).where(eq(contentAccess.id, input.id)).limit(1);
      if (!grant) throw new TRPCError({ code: "NOT_FOUND" });

      const row = await getContentRow(grant.contentType as ContentType, grant.contentId);
      if (row.creatorId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db
        .update(contentAccess)
        .set({ status: input.status, decidedAt: new Date() })
        .where(eq(contentAccess.id, input.id));

      return { ok: true };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = ctx.session.user.id;
    const [myWorks, myProjects, myGalleries] = await Promise.all([
      db.select({ id: work.id }).from(work).where(eq(work.creatorId, creatorId)),
      db.select({ id: project.id }).from(project).where(eq(project.creatorId, creatorId)),
      db.select({ id: galleryCollection.id }).from(galleryCollection).where(eq(galleryCollection.creatorId, creatorId)),
    ]);
    const ownedIds: Record<ContentType, Set<string>> = {
      work: new Set(myWorks.map((w) => w.id)),
      project: new Set(myProjects.map((p) => p.id)),
      gallery: new Set(myGalleries.map((g) => g.id)),
    };

    const pending = await db
      .select({
        access: contentAccess,
        requester: { name: user.name, email: user.email, username: user.username },
      })
      .from(contentAccess)
      .innerJoin(user, eq(contentAccess.userId, user.id))
      .where(eq(contentAccess.status, "pending"));

    return pending
      .filter((row) => ownedIds[row.access.contentType as ContentType]?.has(row.access.contentId))
      .map((row) => ({ ...row.access, requester: row.requester }));
  }),
});
