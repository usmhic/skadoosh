import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { db, work, user, kudos, comment, userSettings } from "@skaddosh/db";
import {
  sendCommentReceivedEmail,
  sendKudosReceivedEmail,
} from "@skaddosh/auth/mailer";
import { router, publicProcedure, protectedProcedure, creatorProcedure } from "../trpc";
import { randomUUID } from "crypto";
import { canViewFull, hasContentAccess } from "../lib/content-access";

const WORK_TYPES = ["story", "novel", "poem", "essay", "article", "journal", "script", "research"] as const;
const KUDOS_COST_COMMENT = 3; // kudos required to leave a comment
const LANG_ORDER = ["ar", "en", "fr", "es"] as const;
type Lang = (typeof LANG_ORDER)[number];
type BodyKey = "bodyAr" | "bodyEn" | "bodyFr" | "bodyEs";

const BODY_KEY: Record<Lang, BodyKey> = {
  ar: "bodyAr",
  en: "bodyEn",
  fr: "bodyFr",
  es: "bodyEs",
};

const LANG_LABEL: Record<Lang, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  es: "Spanish",
};

function parseWork(w: typeof work.$inferSelect) {
  return {
    ...w,
    title:   JSON.parse(w.titleJson)   as Record<string, string>,
    tag:     JSON.parse(w.tagJson)     as Record<string, string>,
    summary: JSON.parse(w.summaryJson) as Record<string, string>,
    tags:    JSON.parse(w.tagsJson)    as string[],
  };
}

function extractResponseText(payload: {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function parseModelJson(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(trimmed) as {
    title?: string;
    tag?: string;
    summary?: string;
    body?: string;
  };
}

function detectSourceLanguage(w: typeof work.$inferSelect, title: Record<string, string>) {
  return LANG_ORDER.find((code) => {
    const body = w[BODY_KEY[code]];
    return body?.trim() || title[code]?.trim();
  }) ?? "en";
}

function workTitleForEmail(w: typeof work.$inferSelect) {
  try {
    const title = JSON.parse(w.titleJson) as Record<string, string>;
    return LANG_ORDER.map((lang) => title[lang]?.trim()).find(Boolean) ?? "Untitled work";
  } catch {
    return "Untitled work";
  }
}

function displayName(person: { name?: string | null; username?: string | null }) {
  return person.name || person.username || "A reader";
}

function truncateForEmail(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

export const worksRouter = router({

  list: publicProcedure
    .input(z.object({
      limit:  z.number().min(1).max(50).default(20),
      offset: z.number().default(0),
      type:   z.enum(WORK_TYPES).optional(),
      tag:    z.string().optional(),   // category tag filter e.g. "intellectual-property"
      interests: z.array(z.string().max(40)).max(12).optional(),
      search: z.string().max(120).optional(),
      sort: z.enum(["popular", "newest", "discussed"]).default("popular"),
    }).optional())
    .query(async ({ input }) => {
      const { limit = 20, offset = 0, type, tag, interests = [], search, sort = "popular" } = input ?? {};
      const conditions = [eq(work.published, true)];
      if (type) conditions.push(eq(work.type, type));
      // Full-text search across title/tag JSON and body
      if (search) {
        const q = `%${search}%`;
        conditions.push(or(
          ilike(work.titleJson, q),
          ilike(work.tagJson, q),
          ilike(work.bodyEn, q),
        )!);
      }
      if (tag) {
        conditions.push(ilike(work.tagsJson, `%"${tag}"%`));
      } else if (interests.length) {
        conditions.push(or(...interests.map((interest) => ilike(work.tagsJson, `%"${interest}"%`)))!);
      }
      const orderBy =
        sort === "newest"
          ? [desc(work.createdAt)]
          : sort === "discussed"
            ? [desc(work.commentsCount), desc(work.createdAt)]
            : [desc(work.kudosCount), desc(work.createdAt)];
      const rows = await db
        .select({ w: work, creator: { name: user.name, username: user.username } })
        .from(work).innerJoin(user, eq(work.creatorId, user.id))
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit).offset(offset);
      return rows.map(r => ({ ...parseWork(r.w), creator: r.creator }));
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({ w: work, creator: { name: user.name, username: user.username } })
        .from(work).innerJoin(user, eq(work.creatorId, user.id))
        .where(and(eq(work.id, input.id), eq(work.published, true))).limit(1);
      if (!rows[0]) return null;

      const viewerId = ctx.session?.user?.id;
      const unlocked =
        canViewFull(rows[0].w, viewerId) || (await hasContentAccess("work", rows[0].w.id, viewerId));

      if (!unlocked) {
        const parsed = parseWork(rows[0].w);
        return {
          locked: true as const,
          id: rows[0].w.id,
          type: rows[0].w.type,
          title: parsed.title,
          tag: parsed.tag,
          summary: parsed.summary,
          accentColor: rows[0].w.accentColor,
          image: rows[0].w.image,
          unlockMethod: rows[0].w.unlockMethod,
          kudosPrice: rows[0].w.kudosPrice,
          creator: rows[0].creator,
        };
      }

      return { locked: false as const, ...parseWork(rows[0].w), creator: rows[0].creator };
    }),

  translate: publicProcedure
    .input(z.object({
      workId: z.string(),
      targetLang: z.enum(LANG_ORDER),
    }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(work)
        .where(and(eq(work.id, input.workId), eq(work.published, true)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const parsed = parseWork(existing);
      const sourceLang = detectSourceLanguage(existing, parsed.title);
      const targetLang = input.targetLang;
      const targetBodyKey = BODY_KEY[targetLang];

      if (targetLang === sourceLang) {
        return {
          fromCache: true,
          lang: targetLang,
          title: parsed.title[targetLang] || parsed.title[sourceLang] || parsed.title.en || "",
          tag: parsed.tag[targetLang] || parsed.tag[sourceLang] || parsed.tag.en || "",
          summary: parsed.summary[targetLang] || parsed.summary[sourceLang] || parsed.summary.en || "",
          body: existing[targetBodyKey] || existing[BODY_KEY[sourceLang]] || existing.bodyEn,
        };
      }

      if (existing[targetBodyKey]?.trim()) {
        return {
          fromCache: true,
          lang: targetLang,
          title: parsed.title[targetLang] ?? "",
          tag: parsed.tag[targetLang] ?? "",
          summary: parsed.summary[targetLang] ?? "",
          body: existing[targetBodyKey],
        };
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "OPENAI_API_KEY is not configured.",
        });
      }

      const sourceBody = existing[BODY_KEY[sourceLang]] || existing.bodyEn || existing.bodyAr;
      if (!sourceBody?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This work does not have source text to translate.",
        });
      }

      const sourceTitle = parsed.title[sourceLang] || parsed.title.en || parsed.title.ar || "Untitled";
      const sourceTag = parsed.tag[sourceLang] || parsed.tag.en || "";
      const sourceSummary = parsed.summary[sourceLang] || parsed.summary.en || "";

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o",
          instructions:
            "Translate literary and article content faithfully. Preserve paragraph breaks, tone, names, markdown emphasis markers, and quoted dialogue. Return only valid JSON with keys: title, tag, summary, body.",
          input: JSON.stringify({
            sourceLanguage: LANG_LABEL[sourceLang],
            targetLanguage: LANG_LABEL[targetLang],
            title: sourceTitle,
            tag: sourceTag,
            summary: sourceSummary,
            body: sourceBody,
          }),
          text: {
            verbosity: "low",
          },
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `OpenAI translation failed: ${await response.text()}`,
        });
      }

      let translated: ReturnType<typeof parseModelJson>;
      try {
        translated = parseModelJson(extractResponseText(await response.json()));
      } catch {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "OpenAI returned an invalid translation payload.",
        });
      }

      const titleJson = { ...parsed.title, [targetLang]: translated.title?.trim() || sourceTitle };
      const tagJson = { ...parsed.tag, [targetLang]: translated.tag?.trim() || sourceTag };
      const summaryJson = { ...parsed.summary, [targetLang]: translated.summary?.trim() || sourceSummary };
      const translatedBody = translated.body?.trim();

      if (!translatedBody) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "OpenAI returned an empty translation.",
        });
      }

      await db
        .update(work)
        .set({
          titleJson: JSON.stringify(titleJson),
          tagJson: JSON.stringify(tagJson),
          summaryJson: JSON.stringify(summaryJson),
          [targetBodyKey]: translatedBody,
          updatedAt: new Date(),
        })
        .where(eq(work.id, input.workId));

      return {
        fromCache: false,
        lang: targetLang,
        title: titleJson[targetLang] ?? "",
        tag: tagJson[targetLang] ?? "",
        summary: summaryJson[targetLang] ?? "",
        body: translatedBody,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(work)
      .where(eq(work.creatorId, ctx.session.user.id))
      .orderBy(desc(work.updatedAt));
    return rows.map(parseWork);
  }),

  create: creatorProcedure
    .input(z.object({
      type: z.enum(WORK_TYPES),
      accentColor: z.string().default("#6366f1"),
      tags: z.array(z.string().max(40)).max(8).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const id  = `work_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      await db.insert(work).values({
        id, creatorId: ctx.session.user.id, type: input.type,
        accentColor: input.accentColor, published: false, kudosCount: 0,
        tagsJson:    JSON.stringify(input.tags),
        titleJson:   JSON.stringify({ ar:"",en:"",fr:"",es:"" }),
        tagJson:     JSON.stringify({ ar:"",en:"",fr:"",es:"" }),
        summaryJson: JSON.stringify({ ar:"",en:"",fr:"",es:"" }),
        bodyAr:"", bodyEn:"", bodyFr:"", bodyEs:"",
        createdAt: now, updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      titleAr: z.string().optional(), titleEn: z.string().optional(),
      titleFr: z.string().optional(), titleEs: z.string().optional(),
      tagAr:   z.string().optional(), tagEn:   z.string().optional(),
      tagFr:   z.string().optional(), tagEs:   z.string().optional(),
      bodyAr:  z.string().optional(), bodyEn:  z.string().optional(),
      bodyFr:  z.string().optional(), bodyEs:  z.string().optional(),
      accentColor: z.string().optional(),
      published:   z.boolean().optional(),
      tags: z.array(z.string().max(40)).max(8).optional(),
      summaryAr: z.string().max(600).optional(),
      summaryEn: z.string().max(600).optional(),
      summaryFr: z.string().max(600).optional(),
      summaryEs: z.string().max(600).optional(),
      visibility: z.enum(["public", "confidential"]).optional(),
      unlockMethod: z.enum(["request", "kudos"]).optional(),
      kudosPrice: z.number().int().min(0).max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(work)
        .where(and(eq(work.id, input.id), eq(work.creatorId, ctx.session.user.id))).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const cur = parseWork(existing);
      const newTitle   = { ar: input.titleAr ?? cur.title.ar, en: input.titleEn ?? cur.title.en, fr: input.titleFr ?? cur.title.fr, es: input.titleEs ?? cur.title.es };
      const newTag     = { ar: input.tagAr   ?? cur.tag.ar,   en: input.tagEn   ?? cur.tag.en,   fr: input.tagFr   ?? cur.tag.fr,   es: input.tagEs   ?? cur.tag.es   };
      const newSummary = { ar: input.summaryAr ?? cur.summary.ar, en: input.summaryEn ?? cur.summary.en, fr: input.summaryFr ?? cur.summary.fr, es: input.summaryEs ?? cur.summary.es };
      const bodyEn     = input.bodyEn ?? existing.bodyEn;
      const words      = bodyEn.trim().split(/\s+/).filter(Boolean).length;
      await db.update(work).set({
        titleJson:   JSON.stringify(newTitle),
        tagJson:     JSON.stringify(newTag),
        summaryJson: JSON.stringify(newSummary),
        tagsJson:    input.tags ? JSON.stringify(input.tags) : existing.tagsJson,
        bodyAr:      input.bodyAr ?? existing.bodyAr,
        bodyEn:      bodyEn,
        bodyFr:      input.bodyFr ?? existing.bodyFr,
        bodyEs:      input.bodyEs ?? existing.bodyEs,
        accentColor: input.accentColor ?? existing.accentColor,
        published:   input.published   ?? existing.published,
        visibility:  input.visibility   ?? existing.visibility,
        unlockMethod: input.unlockMethod ?? existing.unlockMethod,
        kudosPrice:  input.kudosPrice ?? existing.kudosPrice,
        readingTime: Math.max(1, Math.round(words / 200)),
        updatedAt:   new Date(),
      }).where(eq(work.id, input.id));
      return { ok: true };
    }),

  sendKudos: publicProcedure
    .input(z.object({
      workId:  z.string(),
      amount:  z.number().min(1).max(5).default(1),
      message: z.string().max(280).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fromUserId = ctx.session?.user?.id;
      if (!fromUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to send kudos." });

      const [sender] = await db.select().from(user).where(eq(user.id, fromUserId)).limit(1);
      if (!sender) throw new TRPCError({ code: "NOT_FOUND", message: "Sender not found." });
      if (sender.kudosBalance < input.amount) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enough kudos balance." });
      }

      const [target] = await db
        .select({
          w: work,
          creator: {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
          },
        })
        .from(work)
        .innerJoin(user, eq(work.creatorId, user.id))
        .where(eq(work.id, input.workId))
        .limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Work not found." });

      await db.insert(kudos).values({
        id: randomUUID(),
        workId: input.workId,
        fromUserId,
        amount: input.amount,
        message: input.message ?? null,
        createdAt: new Date(),
      });
      const [cur] = await db.select({ n: work.kudosCount }).from(work).where(eq(work.id, input.workId)).limit(1);
      await db.update(work).set({ kudosCount: (cur?.n ?? 0) + input.amount }).where(eq(work.id, input.workId));
      await db.update(user).set({ kudosBalance: sender.kudosBalance - input.amount, updatedAt: new Date() }).where(eq(user.id, fromUserId));

      const [settings] = await db
        .select({ emailNotifications: userSettings.emailNotifications })
        .from(userSettings)
        .where(eq(userSettings.userId, target.creator.id))
        .limit(1);
      if (target.creator.id !== fromUserId && (settings?.emailNotifications ?? true)) {
        await sendKudosReceivedEmail({
          to: target.creator.email,
          creatorName: target.creator.name,
          senderName: displayName(sender),
          workTitle: workTitleForEmail(target.w),
          amount: input.amount,
          message: input.message ? truncateForEmail(input.message, 280) : null,
        });
      }

      return { ok: true };
    }),

  getKudos: publicProcedure
    .input(z.object({ workId: z.string(), limit: z.number().min(1).max(100).default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({ k: kudos, giver: { name: user.name, username: user.username } })
        .from(kudos)
        .leftJoin(user, eq(kudos.fromUserId, user.id))
        .where(eq(kudos.workId, input.workId))
        .orderBy(desc(kudos.createdAt))
        .limit(input.limit).offset(input.offset);
      return rows.map(r => ({ ...r.k, giver: r.giver }));
    }),

  getComments: publicProcedure
    .input(z.object({ workId: z.string(), limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({ c: comment, author: { name: user.name, username: user.username } })
        .from(comment)
        .innerJoin(user, eq(comment.fromUserId, user.id))
        .where(eq(comment.workId, input.workId))
        .orderBy(desc(comment.createdAt))
        .limit(input.limit).offset(input.offset);
      return rows.map(r => ({ ...r.c, author: r.author }));
    }),

  addComment: protectedProcedure
    .input(z.object({ workId: z.string(), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [dbUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
      if (!dbUser || dbUser.kudosBalance < KUDOS_COST_COMMENT) {
        throw new TRPCError({ code: "FORBIDDEN", message: `You need at least ${KUDOS_COST_COMMENT} kudos to comment.` });
      }

      const [target] = await db
        .select({
          w: work,
          creator: {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
          },
        })
        .from(work)
        .innerJoin(user, eq(work.creatorId, user.id))
        .where(eq(work.id, input.workId))
        .limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Work not found." });

      const now = new Date();
      await db.insert(comment).values({ id: randomUUID(), workId: input.workId, fromUserId: userId, body: input.body, kudosSpent: KUDOS_COST_COMMENT, createdAt: now });
      await db.update(user).set({ kudosBalance: dbUser.kudosBalance - KUDOS_COST_COMMENT, updatedAt: new Date() }).where(eq(user.id, userId));
      const [cur] = await db.select({ n: work.commentsCount }).from(work).where(eq(work.id, input.workId)).limit(1);
      await db.update(work).set({ commentsCount: (cur?.n ?? 0) + 1 }).where(eq(work.id, input.workId));

      const [settings] = await db
        .select({ emailNotifications: userSettings.emailNotifications })
        .from(userSettings)
        .where(eq(userSettings.userId, target.creator.id))
        .limit(1);
      if (target.creator.id !== userId && (settings?.emailNotifications ?? true)) {
        await sendCommentReceivedEmail({
          to: target.creator.email,
          creatorName: target.creator.name,
          commenterName: displayName(dbUser),
          workTitle: workTitleForEmail(target.w),
          comment: truncateForEmail(input.body, 600),
        });
      }

      return { ok: true };
    }),

  summarize: publicProcedure
    .input(z.object({ workId: z.string(), lang: z.enum(["ar","en","fr","es"]).default("en") }))
    .query(async ({ input }) => {
      const [w] = await db.select().from(work).where(and(eq(work.id, input.workId), eq(work.published, true))).limit(1);
      if (!w) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = JSON.parse(w.summaryJson) as Record<string, string>;
      if (existing[input.lang]) return { summary: existing[input.lang], fromCache: true };
      // Fallback: extract first ~3 sentences of the body as summary
      const bodyMap: Record<string, keyof typeof w> = { ar:"bodyAr", en:"bodyEn", fr:"bodyFr", es:"bodyEs" };
      const body = (w[bodyMap[input.lang] as keyof typeof w] as string) || w.bodyEn;
      const sentences = body.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
      const summary = sentences.slice(0, 450) || "No summary available.";
      const updated = { ...existing, [input.lang]: summary };
      await db.update(work).set({ summaryJson: JSON.stringify(updated) }).where(eq(work.id, input.workId));
      return { summary, fromCache: false };
    }),
});
