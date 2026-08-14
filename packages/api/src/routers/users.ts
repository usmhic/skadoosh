import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, user, userSettings } from "@skaddosh/db";
import { router, protectedProcedure } from "../trpc";

export const usersRouter = router({

  me: protectedProcedure.query(async ({ ctx }) => {
    const [u] = await db.select().from(user).where(eq(user.id, ctx.session.user.id)).limit(1);
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, u.id)).limit(1);
    return { user: u, settings: settings ?? null };
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name:     z.string().min(1).max(80).optional(),
      username: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, _ and - allowed").optional(),
      bio:      z.string().max(300).optional(),
      website:  z.string().url().max(120).optional().or(z.literal("")),
      location: z.string().max(80).optional(),
      image:    z.string().url().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.username) {
        const [taken] = await db.select({ id: user.id }).from(user)
          .where(eq(user.username, input.username)).limit(1);
        if (taken && taken.id !== userId) throw new TRPCError({ code: "CONFLICT", message: "Username already taken." });
      }
      await db.update(user).set({
        ...(input.name     !== undefined && { name:     input.name }),
        ...(input.username !== undefined && { username: input.username }),
        ...(input.bio      !== undefined && { bio:      input.bio }),
        ...(input.website  !== undefined && { website:  input.website || null }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.image    !== undefined && { image:    input.image }),
        updatedAt: new Date(),
      }).where(eq(user.id, userId));
      return { ok: true };
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const [s] = await db.select().from(userSettings)
      .where(eq(userSettings.userId, ctx.session.user.id)).limit(1);
    return s ?? null;
  }),

  updateSettings: protectedProcedure
    .input(z.object({
      preferredLang:      z.enum(["ar","en","fr","es"]).optional(),
      emailNotifications: z.boolean().optional(),
      marketingEmails:    z.boolean().optional(),
      profilePublic:      z.boolean().optional(),
      portfolioEnabled:   z.boolean().optional(),
      showKudosBalance:   z.boolean().optional(),
      contentCategories:  z.array(z.string().max(40)).max(12).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();
      const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      if (existing) {
        await db.update(userSettings).set({
          ...(input.preferredLang      !== undefined && { preferredLang:      input.preferredLang }),
          ...(input.emailNotifications !== undefined && { emailNotifications: input.emailNotifications }),
          ...(input.marketingEmails    !== undefined && { marketingEmails:    input.marketingEmails }),
          ...(input.profilePublic      !== undefined && { profilePublic:      input.profilePublic }),
          ...(input.portfolioEnabled   !== undefined && { portfolioEnabled:   input.portfolioEnabled }),
          ...(input.showKudosBalance   !== undefined && { showKudosBalance:   input.showKudosBalance }),
          ...(input.contentCategories  !== undefined && { contentCategories:  JSON.stringify(input.contentCategories) }),
          updatedAt: now,
        }).where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({
          userId,
          preferredLang:      input.preferredLang      ?? "en",
          emailNotifications: input.emailNotifications ?? true,
          marketingEmails:    input.marketingEmails    ?? false,
          profilePublic:      input.profilePublic      ?? true,
          portfolioEnabled:   input.portfolioEnabled   ?? true,
          showKudosBalance:   input.showKudosBalance   ?? true,
          contentCategories:  JSON.stringify(input.contentCategories ?? []),
          updatedAt: now,
        });
      }
      return { ok: true };
    }),

});
