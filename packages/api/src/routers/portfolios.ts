import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import {
  billingSubscriptions,
  db,
  galleryCollection,
  portfolioAnalyticsEvents,
  portfolioProfiles,
  project,
  user,
  work,
} from "@skaddosh/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { hasContentAccess } from "../lib/content-access";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "blog",
  "creator",
  "docs",
  "edit",
  "marketing",
  "portfolio",
  "profile",
  "read",
  "settings",
  "studio",
  "support",
  "www",
]);

const slugifyUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const CUSTOM_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const normalizeCustomDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(/[/?#]/)[0]
    ?.replace(/\.$/, "") ?? "";

function assertValidCustomDomain(domain: string) {
  if (!domain) return;

  if (!CUSTOM_DOMAIN_PATTERN.test(domain)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use a valid custom domain, like portfolio.example.com.",
    });
  }

  if (domain === "skaddosh" || domain.endsWith(".skaddosh")) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "skaddosh domains are reserved for platform routes.",
    });
  }
}

const linkSchema = z.string().max(260).optional().default("");

const portfolioCustomizationSchema = z.object({
  themePreset: z
    .enum(["skaddosh", "ink", "ember", "forest", "ocean"])
    .default("skaddosh"),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#18181b"),
  headingFont: z.enum(["Spectral", "Geist", "Cairo"]).default("Spectral"),
  monoFont: z.enum(["Geist Mono", "Cairo"]).default("Geist Mono"),
  heroAlignment: z.enum(["left", "center"]).default("left"),
  sectionSpacing: z.enum(["compact", "balanced", "airy"]).default("balanced"),
  cardStyle: z.enum(["soft", "outline", "elevated"]).default("soft"),
  visibleSections: z
    .array(z.enum(["about", "articles", "projects", "gallery", "contact"]))
    .default(["about", "articles", "contact"]),
  customDomainRequested: z.boolean().default(false),
  customDomain: z.string().max(253).default(""),
});

const socialSchema = z.object({
  github: linkSchema,
  linkedin: linkSchema,
  instagram: linkSchema,
});

const siteConfigSchema = z.object({
  name: z.string().max(120).default(""),
  firstName: z.string().max(80).default(""),
  lastName: z.string().max(80).default(""),
  initials: z.string().max(8).default(""),
  tagline: z.string().max(320).default(""),
  location: z.string().max(120).default(""),
  phone: z.string().max(80).default(""),
  email: z.string().max(160).default(""),
  avatar: linkSchema,
  social: socialSchema.default({ github: "", linkedin: "", instagram: "" }),
});

const heroImageSchema = z.object({
  url: linkSchema,
  alt: z.string().max(180).default(""),
});

const aboutStorySchema = z.object({
  whoAmI: z.object({
    label: z.string().max(80).default("01 - Who"),
    title: z.string().max(180).default(""),
    body: z.string().max(1200).default(""),
    location: z.string().max(160).default(""),
  }),
  whatIDo: z.object({
    label: z.string().max(80).default("02 - What"),
    title: z.string().max(180).default(""),
    body: z.string().max(1200).default(""),
    pillars: z
      .array(z.object({ k: z.string().max(80), v: z.string().max(140) }))
      .max(6)
      .default([]),
  }),
});

const timelineEntrySchema = z.object({
  id: z.string().max(80),
  year: z.string().max(80),
  type: z.enum(["work", "academic", "project", "award"]).default("work"),
  title: z.string().max(180),
  org: z.string().max(180).default(""),
  description: z.string().max(700).default(""),
  tags: z.array(z.string().max(40)).max(16).default([]),
  image: linkSchema,
});

const researchSchema = z.object({
  id: z.string().max(80),
  field: z.string().max(120).default(""),
  title: z.string().max(180),
  description: z.string().max(700).default(""),
  collaborators: z.array(z.string().max(80)).max(12).default([]),
  status: z.enum(["ongoing", "published", "exploratory"]).default("exploratory"),
});

const hobbySchema = z.object({
  id: z.string().max(80),
  emoji: z.string().max(16).default("*"),
  title: z.string().max(120),
  description: z.string().max(300).default(""),
});

const highlightingSchema = z.object({
  workIds:    z.array(z.string()).max(24).default([]),
  projectIds: z.array(z.string()).max(24).default([]),
  galleryIds: z.array(z.string()).max(12).default([]),
});

const portfolioContentSchema = z.object({
  siteConfig: siteConfigSchema,
  heroImage: heroImageSchema,
  aboutStory: aboutStorySchema,
  timeline: z.array(timelineEntrySchema).max(40).default([]),
  research: z.array(researchSchema).max(30).default([]),
  hobbies: z.array(hobbySchema).max(30).default([]),
  highlighting: highlightingSchema.default({ workIds: [], projectIds: [], galleryIds: [] }),
});

const inboxMessageSchema = z.object({
  id: z.string(),
  kind: z.enum(["access_request", "contact"]),
  createdAt: z.number(),
  read: z.boolean(),
  subject: z.string(),
  from: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    company: z.string().optional(),
  }),
  body: z.string(),
  meta: z.record(z.string()).optional(),
});

type PortfolioCustomization = z.infer<typeof portfolioCustomizationSchema>;
type PortfolioContent = z.infer<typeof portfolioContentSchema>;
export type PortfolioInboxMessage = z.infer<typeof inboxMessageSchema>;

const defaultCustomization: PortfolioCustomization = {
  themePreset: "skaddosh",
  accentColor: "#18181b",
  headingFont: "Spectral",
  monoFont: "Geist Mono",
  heroAlignment: "left",
  sectionSpacing: "balanced",
  cardStyle: "soft",
  visibleSections: ["about", "articles", "contact"],
  customDomainRequested: false,
  customDomain: "",
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "Q";

const splitName = (name: string) => {
  const [firstName = name || "Creator", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
};

export function defaultContentFor(input: {
  name: string;
  email?: string | null;
  username: string;
  prompt?: string | null;
  location?: string | null;
  website?: string | null;
  bio?: string | null;
}): PortfolioContent {
  const { firstName, lastName } = splitName(input.name);
  const tagline =
    input.prompt ||
    input.bio ||
    "A portfolio for selected work, story, research, and creative practice.";

  return {
    siteConfig: {
      name: input.name,
      firstName,
      lastName,
      initials: initialsFor(input.name),
      tagline,
      location: input.location || "Open to thoughtful work",
      phone: "",
      email: input.email || "",
      avatar: "",
      social: {
        github: "",
        linkedin: input.website || "",
        instagram: "",
      },
    },
    heroImage: {
      url: "",
      alt: input.name,
    },
    aboutStory: {
      whoAmI: {
        label: "01 - Who",
        title: `Hi, I am ${firstName}.`,
        body: tagline,
        location: input.location || "Available worldwide",
      },
      whatIDo: {
        label: "02 - What",
        title: "I build work with a point of view.",
        body: "Shape this section around the through-line that connects your story, experience, education, and creative life.",
        pillars: [
          { k: "Practice", v: "What you consistently make" },
          { k: "Range", v: "Where your work can stretch" },
          { k: "Signal", v: "Why people should trust you" },
        ],
      },
    },
    timeline: [],
    research: [],
    hobbies: [],
    highlighting: { workIds: [], projectIds: [], galleryIds: [] },
  };
}

export function parseMetadata(
  metadata: unknown,
  fallback: PortfolioContent,
): {
  customization: PortfolioCustomization;
  content: PortfolioContent;
  inbox: PortfolioInboxMessage[];
} {
  const raw = metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
  const oldCustomization = raw.themePreset || raw.accentColor ? raw : {};

  return {
    customization: portfolioCustomizationSchema.parse({
      ...defaultCustomization,
      ...(raw.customization && typeof raw.customization === "object" ? raw.customization : oldCustomization),
    }),
    content: portfolioContentSchema.parse({
      ...fallback,
      ...(raw.content && typeof raw.content === "object" ? raw.content : {}),
    }),
    inbox: z.array(inboxMessageSchema).catch([]).parse(raw.inbox),
  };
}

function packMetadata(input: {
  customization: PortfolioCustomization;
  content: PortfolioContent;
  inbox?: PortfolioInboxMessage[];
}) {
  return {
    customization: portfolioCustomizationSchema.parse(input.customization),
    content: portfolioContentSchema.parse(input.content),
    inbox: z.array(inboxMessageSchema).catch([]).parse(input.inbox),
  };
}

async function getUserById(userId: string) {
  const [currentUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!currentUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  return currentUser;
}

function defaultUsernameFor(currentUser: Awaited<ReturnType<typeof getUserById>>) {
  return (
    slugifyUsername(currentUser.username || "") ||
    slugifyUsername(currentUser.name || "") ||
    slugifyUsername(currentUser.email.split("@")[0] || "") ||
    "portfolio"
  );
}

function profilePayload(
  profile: typeof portfolioProfiles.$inferSelect,
  owner: {
    name: string;
    email?: string | null;
    username?: string | null;
    location?: string | null;
    website?: string | null;
    bio?: string | null;
  },
) {
  const fallback = defaultContentFor({
    name: profile.displayName || owner.name,
    email: owner.email,
    username: profile.username || owner.username || "portfolio",
    prompt: profile.prompt,
    location: owner.location,
    website: owner.website,
    bio: owner.bio,
  });
  const normalized = parseMetadata(profile.metadata, fallback);

  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    prompt: profile.prompt,
    profileType: profile.profileType ?? "individual",
    status: profile.status,
    published: profile.published,
    theme: profile.theme,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    customization: normalized.customization,
    content: normalized.content,
    inbox: normalized.inbox,
  };
}

function parsePortfolioWork(w: typeof work.$inferSelect) {
  return {
    id: w.id,
    type: w.type,
    title: JSON.parse(w.titleJson) as Record<string, string>,
    tag: JSON.parse(w.tagJson) as Record<string, string>,
    readingTime: w.readingTime,
    kudosCount: w.kudosCount,
    accentColor: w.accentColor,
    createdAt: w.createdAt,
  };
}

async function isLockedForViewer(
  contentType: "work" | "project" | "gallery",
  row: { id: string; visibility: string; creatorId: string },
  viewerId: string | null | undefined,
) {
  if (row.visibility !== "confidential") return false;
  if (row.creatorId === viewerId) return false;
  return !(await hasContentAccess(contentType, row.id, viewerId));
}

export async function getPublishedWorksForUserId(
  userId: string,
  ids: string[] | undefined,
  viewerId: string | null | undefined,
) {
  const conditions = [eq(work.creatorId, userId), eq(work.published, true)];
  if (ids?.length) conditions.push(inArray(work.id, ids));

  const rows = await db
    .select()
    .from(work)
    .where(and(...conditions))
    .orderBy(desc(work.createdAt))
    .limit(12);

  return Promise.all(
    rows.map(async (w) => ({
      ...parsePortfolioWork(w),
      locked: await isLockedForViewer("work", w, viewerId),
    })),
  );
}

export async function getPortfolioProjects(
  userId: string,
  ids: string[] | undefined,
  viewerId: string | null | undefined,
) {
  const conditions = [eq(project.creatorId, userId), eq(project.status, "published")];
  if (ids?.length) conditions.push(inArray(project.id, ids));

  const rows = await db
    .select()
    .from(project)
    .where(and(...conditions))
    .orderBy(desc(project.updatedAt))
    .limit(12);

  return Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      coverImage: p.coverImage,
      accentColor: p.accentColor,
      tags: JSON.parse(p.tags) as string[],
      url: p.url,
      locked: await isLockedForViewer("project", p, viewerId),
    })),
  );
}

export async function getPortfolioGallery(
  userId: string,
  ids: string[] | undefined,
  viewerId: string | null | undefined,
) {
  const conditions = [eq(galleryCollection.creatorId, userId), eq(galleryCollection.status, "published")];
  if (ids?.length) conditions.push(inArray(galleryCollection.id, ids));

  const rows = await db
    .select()
    .from(galleryCollection)
    .where(and(...conditions))
    .orderBy(desc(galleryCollection.updatedAt))
    .limit(12);

  return Promise.all(
    rows.map(async (g) => {
      const images = JSON.parse(g.images) as Array<{ url: string; caption?: string }>;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        coverImage: g.coverImage,
        accentColor: g.accentColor,
        imageCount: images.length,
        images: images.map((img) => ({ url: img.url, caption: img.caption ?? "" })),
        locked: await isLockedForViewer("gallery", g, viewerId),
      };
    }),
  );
}

async function getProfileByUsername(username: string) {
  const [profile] = await db
    .select()
    .from(portfolioProfiles)
    .where(eq(portfolioProfiles.username, username))
    .limit(1);

  if (!profile) return null;

  const [owner] = await db.select().from(user).where(eq(user.id, profile.userId)).limit(1);
  if (!owner) return null;

  return profilePayload(profile, owner);
}

/**
 * Drops a message into a creator's portfolio inbox, e.g. to notify them of a
 * confidential-content access request. No-ops if the creator has no portfolio yet.
 */
export async function notifyOwnerInbox(
  ownerId: string,
  message: Omit<PortfolioInboxMessage, "id" | "createdAt" | "read">,
) {
  const [profile] = await db
    .select()
    .from(portfolioProfiles)
    .where(eq(portfolioProfiles.userId, ownerId))
    .limit(1);
  if (!profile) return;

  const [owner] = await db.select().from(user).where(eq(user.id, ownerId)).limit(1);
  if (!owner) return;

  const fallback = defaultContentFor({
    name: profile.displayName,
    email: owner.email,
    username: profile.username,
    prompt: profile.prompt,
    location: owner.location,
    website: owner.website,
    bio: owner.bio,
  });
  const metadata = parseMetadata(profile.metadata, fallback);
  const inboxMessage: PortfolioInboxMessage = {
    id: `msg-${Date.now()}-${crypto.randomUUID()}`,
    createdAt: Date.now(),
    read: false,
    ...message,
  };

  await db
    .update(portfolioProfiles)
    .set({
      metadata: packMetadata({
        customization: metadata.customization,
        content: metadata.content,
        inbox: [inboxMessage, ...metadata.inbox].slice(0, 100),
      }),
      updatedAt: new Date(),
    })
    .where(eq(portfolioProfiles.id, profile.id));
}

async function getBillingSubscriptionForUserId(userId: string) {
  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.userId, userId))
    .limit(1);

  return subscription ?? null;
}

function hasPremiumAccess(subscription: Awaited<ReturnType<typeof getBillingSubscriptionForUserId>>) {
  return ["active", "trialing", "past_due"].includes(subscription?.status ?? "");
}

async function getPremiumForUserId(userId: string) {
  return hasPremiumAccess(await getBillingSubscriptionForUserId(userId));
}

function searchableText(parts: Array<string | string[] | null | undefined>) {
  return parts
    .flatMap((part) => Array.isArray(part) ? part : [part])
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();
}

function searchPortfolio(profile: ReturnType<typeof profilePayload>, query: string) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const base = `/portfolio/${profile.username}`;
  const content = profile.content;
  const entries = [
    {
      type: "profile",
      title: content.siteConfig.name || profile.displayName,
      description: content.siteConfig.tagline || profile.prompt,
      href: base,
      haystack: searchableText([
        profile.displayName,
        profile.prompt,
        content.siteConfig.name,
        content.siteConfig.tagline,
        content.siteConfig.location,
      ]),
    },
    ...content.timeline.map((item) => ({
      type: "timeline",
      title: item.title,
      description: item.description,
      href: base,
      haystack: searchableText([
        item.year,
        item.type,
        item.title,
        item.org,
        item.description,
        item.tags,
      ]),
    })),
    ...content.research.map((item) => ({
      type: "research",
      title: item.title,
      description: item.description,
      href: base,
      haystack: searchableText([
        item.field,
        item.title,
        item.description,
        item.status,
        item.collaborators,
      ]),
    })),
    ...content.hobbies.map((item) => ({
      type: "hobby",
      title: item.title,
      description: item.description,
      href: base,
      haystack: searchableText([item.emoji, item.title, item.description]),
    })),
  ];

  return entries
    .filter((entry) => entry.haystack.includes(needle))
    .slice(0, 12)
    .map((entry) => ({
      type: entry.type,
      title: entry.title,
      description: entry.description,
      href: entry.href,
    }));
}

const savePortfolioInput = z.object({
  username: z.string().min(1).max(48),
  displayName: z.string().min(1).max(120),
  prompt: z.string().min(1).max(400),
  profileType: z.enum(["individual", "team", "studio", "company", "community"]).default("individual"),
  published: z.boolean().default(true),
  customization: portfolioCustomizationSchema,
  content: portfolioContentSchema,
});

export const portfoliosRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await getUserById(ctx.session.user.id);
    const [profile] = await db
      .select()
      .from(portfolioProfiles)
      .where(eq(portfolioProfiles.userId, currentUser.id))
      .limit(1);

    const username = profile?.username || defaultUsernameFor(currentUser);
    const displayName = profile?.displayName || currentUser.name;
    const prompt =
      profile?.prompt ||
      currentUser.bio ||
      "A portfolio for selected work, story, research, and creative practice.";

    const draft = profile
      ? profilePayload(profile, currentUser)
      : {
          id: null,
          userId: currentUser.id,
          username,
          displayName,
          prompt,
          profileType: "individual",
          status: "published",
          published: true,
          theme: defaultCustomization.themePreset,
          createdAt: null,
          updatedAt: null,
          customization: defaultCustomization,
          content: defaultContentFor({
            name: displayName,
            email: currentUser.email,
            username,
            prompt,
            location: currentUser.location,
            website: currentUser.website,
            bio: currentUser.bio,
          }),
          inbox: [] as PortfolioInboxMessage[],
        };

    const [studioProjects, galleryCollections] = await Promise.all([
      db.select().from(project).where(eq(project.creatorId, currentUser.id)).orderBy(desc(project.updatedAt)),
      db.select().from(galleryCollection).where(eq(galleryCollection.creatorId, currentUser.id)).orderBy(desc(galleryCollection.updatedAt)),
    ]);

    return {
      exists: Boolean(profile),
      portfolio: draft,
      works: await getPublishedWorksForUserId(currentUser.id, undefined, currentUser.id),
      projects: studioProjects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        coverImage: p.coverImage,
        status: p.status,
        accentColor: p.accentColor,
        tags: JSON.parse(p.tags) as string[],
        url: p.url,
      })),
      gallery: galleryCollections.map((g) => {
        const images = JSON.parse(g.images) as Array<{ url: string; caption?: string }>;
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          coverImage: g.coverImage,
          status: g.status,
          accentColor: g.accentColor,
          imageCount: images.length,
          images: images.map((img) => ({ url: img.url, caption: img.caption ?? "" })),
        };
      }),
      premium: await getPremiumForUserId(currentUser.id),
    };
  }),

  billingMine: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await getUserById(ctx.session.user.id);
    const subscription = await getBillingSubscriptionForUserId(currentUser.id);
    const [profile] = await db
      .select()
      .from(portfolioProfiles)
      .where(eq(portfolioProfiles.userId, currentUser.id))
      .limit(1);

    const payload = profile ? profilePayload(profile, currentUser) : null;
    const customDomain = payload?.customization.customDomain ?? "";
    const customDomainRequested = payload?.customization.customDomainRequested ?? false;

    return {
      plan: subscription?.plan ?? "free",
      status: subscription?.status ?? "inactive",
      premium: hasPremiumAccess(subscription),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      currentPeriodEndsAt: subscription?.currentPeriodEndsAt ?? null,
      customDomain,
      customDomainRequested,
      customDomainReady: Boolean(customDomain && customDomainRequested),
    };
  }),

  byUsername: publicProcedure
    .input(z.object({ username: z.string().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      const username = slugifyUsername(input.username);
      const profile = await getProfileByUsername(username);
      if (!profile) return null;
      if (!profile.published) return null;

      const viewerId = ctx.session?.user?.id;
      const highlighting = profile.content.highlighting;

      return {
        ...profile,
        works: await getPublishedWorksForUserId(
          profile.userId,
          highlighting.workIds.length ? highlighting.workIds : undefined,
          viewerId,
        ),
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
        inbox: undefined,
        premium: await getPremiumForUserId(profile.userId),
      };
    }),

  searchPublic: publicProcedure
    .input(z.object({
      username: z.string().min(1).max(80),
      query: z.string().min(1).max(120),
    }))
    .query(async ({ input }) => {
      const profile = await getProfileByUsername(slugifyUsername(input.username));
      if (!profile) return { portfolio: null, results: [] };
      if (!profile.published) return { portfolio: null, results: [] };

      return {
        portfolio: {
          username: profile.username,
          displayName: profile.displayName,
        },
        results: searchPortfolio(profile, input.query),
      };
    }),

  saveMine: protectedProcedure
    .input(savePortfolioInput)
    .mutation(async ({ ctx, input }) => {
      const currentUser = await getUserById(ctx.session.user.id);
      const username = slugifyUsername(input.username);
      const customDomain = normalizeCustomDomain(input.customization.customDomain);
      assertValidCustomDomain(customDomain);

      const customization = portfolioCustomizationSchema.parse({
        ...input.customization,
        customDomain,
        customDomainRequested: Boolean(customDomain && input.customization.customDomainRequested),
      });

      if (!username) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Portfolio username is required." });
      }

      if (username.length < 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use at least 3 characters for the portfolio URL." });
      }

      if (RESERVED_USERNAMES.has(username)) {
        throw new TRPCError({ code: "CONFLICT", message: "That portfolio URL is reserved." });
      }

      const [conflict] = await db
        .select({ id: portfolioProfiles.id })
        .from(portfolioProfiles)
        .where(and(eq(portfolioProfiles.username, username), ne(portfolioProfiles.userId, currentUser.id)))
        .limit(1);

      if (conflict) {
        throw new TRPCError({ code: "CONFLICT", message: "That portfolio URL is already taken." });
      }

      const [existing] = await db
        .select()
        .from(portfolioProfiles)
        .where(eq(portfolioProfiles.userId, currentUser.id))
        .limit(1);

      const previous = existing
        ? parseMetadata(
            existing.metadata,
            defaultContentFor({
              name: existing.displayName,
              email: currentUser.email,
              username: existing.username,
              prompt: existing.prompt,
              location: currentUser.location,
              website: currentUser.website,
              bio: currentUser.bio,
            }),
          )
        : { inbox: [] as PortfolioInboxMessage[] };

      const metadata = packMetadata({
        customization,
        content: input.content,
        inbox: previous.inbox,
      });

      if (existing) {
        const [updated] = await db
          .update(portfolioProfiles)
          .set({
            username,
            displayName: input.displayName.trim(),
            prompt: input.prompt.trim(),
            profileType: input.profileType,
            status: "published",
            published: true,
            theme: customization.themePreset,
            metadata,
            updatedAt: new Date(),
          })
          .where(eq(portfolioProfiles.userId, currentUser.id))
          .returning();

        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return profilePayload(updated, currentUser);
      }

      const [created] = await db
        .insert(portfolioProfiles)
        .values({
          userId: currentUser.id,
          username,
          displayName: input.displayName.trim(),
          prompt: input.prompt.trim(),
          profileType: input.profileType,
          status: "published",
          published: true,
          theme: customization.themePreset,
          metadata,
        })
        .returning();

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return profilePayload(created, currentUser);
    }),

  recordEvent: publicProcedure
    .input(z.object({
      username: z.string().min(1).max(80),
      eventType: z.enum(["view", "click"]),
      eventName: z.string().min(1).max(120),
      path: z.string().max(500).default(""),
      visitorId: z.string().max(120).optional().nullable(),
      referrer: z.string().max(500).optional().nullable(),
      metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    }))
    .mutation(async ({ input }) => {
      const profile = await getProfileByUsername(input.username);
      if (!profile) return { ok: false };

      await db.insert(portfolioAnalyticsEvents).values({
        portfolioProfileId: profile.id,
        eventType: input.eventType,
        eventName: input.eventName,
        path: input.path || `/portfolio/${profile.username}`,
        visitorId: input.visitorId ?? null,
        referrer: input.referrer ?? null,
        metadata: input.metadata ?? null,
      });

      return { ok: true };
    }),

  analyticsMine: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await getUserById(ctx.session.user.id);
    const [profile] = await db
      .select()
      .from(portfolioProfiles)
      .where(eq(portfolioProfiles.userId, currentUser.id))
      .limit(1);

    if (!profile) {
      return {
        totals: { views: 0, clicks: 0, uniqueVisitors: 0 },
        topActions: [] as Array<{ name: string; total: number }>,
        recentEvents: [] as Array<{
          id: string;
          eventType: string;
          eventName: string;
          path: string;
          createdAt: Date;
        }>,
      };
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await db
      .select()
      .from(portfolioAnalyticsEvents)
      .where(
        and(
          eq(portfolioAnalyticsEvents.portfolioProfileId, profile.id),
          gte(portfolioAnalyticsEvents.createdAt, since),
        ),
      )
      .orderBy(desc(portfolioAnalyticsEvents.createdAt))
      .limit(500);

    const views = events.filter((event) => event.eventType === "view");
    const clicks = events.filter((event) => event.eventType === "click");
    const uniqueVisitors = new Set(events.map((event) => event.visitorId).filter(Boolean));
    const topActionsMap = new Map<string, number>();

    for (const event of clicks) {
      topActionsMap.set(event.eventName, (topActionsMap.get(event.eventName) ?? 0) + 1);
    }

    return {
      totals: {
        views: views.length,
        clicks: clicks.length,
        uniqueVisitors: uniqueVisitors.size,
      },
      topActions: Array.from(topActionsMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      recentEvents: events.slice(0, 8).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventName: event.eventName,
        path: event.path,
        createdAt: event.createdAt,
      })),
    };
  }),

  submitContact: publicProcedure
    .input(z.object({
      username: z.string().min(1).max(80),
      kind: z.enum(["access_request", "contact"]).default("contact"),
      subject: z.string().min(1).max(160),
      from: z.object({
        name: z.string().min(1).max(120),
        email: z.string().email().max(180),
        phone: z.string().max(80).optional(),
        company: z.string().max(120).optional(),
      }),
      body: z.string().min(1).max(2000),
      meta: z.record(z.string().max(240)).optional(),
    }))
    .mutation(async ({ input }) => {
      const username = slugifyUsername(input.username);
      const [profile] = await db
        .select()
        .from(portfolioProfiles)
        .where(eq(portfolioProfiles.username, username))
        .limit(1);

      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Portfolio not found." });

      const [owner] = await db.select().from(user).where(eq(user.id, profile.userId)).limit(1);
      if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Portfolio owner not found." });

      const fallback = defaultContentFor({
        name: profile.displayName,
        email: owner.email,
        username: profile.username,
        prompt: profile.prompt,
        location: owner.location,
        website: owner.website,
        bio: owner.bio,
      });
      const metadata = parseMetadata(profile.metadata, fallback);
      const message: PortfolioInboxMessage = {
        id: `msg-${Date.now()}-${crypto.randomUUID()}`,
        kind: input.kind,
        createdAt: Date.now(),
        read: false,
        subject: input.subject,
        from: input.from,
        body: input.body,
        meta: input.meta,
      };

      await db
        .update(portfolioProfiles)
        .set({
          metadata: packMetadata({
            customization: metadata.customization,
            content: metadata.content,
            inbox: [message, ...metadata.inbox].slice(0, 100),
          }),
          updatedAt: new Date(),
        })
        .where(eq(portfolioProfiles.id, profile.id));

      return { ok: true };
    }),

  markInboxRead: protectedProcedure
    .input(z.object({ id: z.string(), read: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await getUserById(ctx.session.user.id);
      const [profile] = await db
        .select()
        .from(portfolioProfiles)
        .where(eq(portfolioProfiles.userId, currentUser.id))
        .limit(1);

      if (!profile) return { ok: false };

      const fallback = defaultContentFor({
        name: profile.displayName,
        email: currentUser.email,
        username: profile.username,
        prompt: profile.prompt,
        location: currentUser.location,
        website: currentUser.website,
        bio: currentUser.bio,
      });
      const metadata = parseMetadata(profile.metadata, fallback);
      const inbox = metadata.inbox.map((message) =>
        message.id === input.id ? { ...message, read: input.read } : message,
      );

      await db
        .update(portfolioProfiles)
        .set({
          metadata: packMetadata({
            customization: metadata.customization,
            content: metadata.content,
            inbox,
          }),
          updatedAt: new Date(),
        })
        .where(eq(portfolioProfiles.id, profile.id));

      return { ok: true };
    }),

  removeInboxMessage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await getUserById(ctx.session.user.id);
      const [profile] = await db
        .select()
        .from(portfolioProfiles)
        .where(eq(portfolioProfiles.userId, currentUser.id))
        .limit(1);

      if (!profile) return { ok: false };

      const fallback = defaultContentFor({
        name: profile.displayName,
        email: currentUser.email,
        username: profile.username,
        prompt: profile.prompt,
        location: currentUser.location,
        website: currentUser.website,
        bio: currentUser.bio,
      });
      const metadata = parseMetadata(profile.metadata, fallback);

      await db
        .update(portfolioProfiles)
        .set({
          metadata: packMetadata({
            customization: metadata.customization,
            content: metadata.content,
            inbox: metadata.inbox.filter((message) => message.id !== input.id),
          }),
          updatedAt: new Date(),
        })
        .where(eq(portfolioProfiles.id, profile.id));

      return { ok: true };
    }),

  clearInbox: protectedProcedure.mutation(async ({ ctx }) => {
    const currentUser = await getUserById(ctx.session.user.id);
    const [profile] = await db
      .select()
      .from(portfolioProfiles)
      .where(eq(portfolioProfiles.userId, currentUser.id))
      .limit(1);

    if (!profile) return { ok: false };

    const fallback = defaultContentFor({
      name: profile.displayName,
      email: currentUser.email,
      username: profile.username,
      prompt: profile.prompt,
      location: currentUser.location,
      website: currentUser.website,
      bio: currentUser.bio,
    });
    const metadata = parseMetadata(profile.metadata, fallback);

    await db
      .update(portfolioProfiles)
      .set({
        metadata: packMetadata({
          customization: metadata.customization,
          content: metadata.content,
          inbox: [],
        }),
        updatedAt: new Date(),
      })
      .where(eq(portfolioProfiles.id, profile.id));

    return { ok: true };
  }),
});
