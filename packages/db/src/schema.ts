/**
 * @skaddosh/db  — database schema
 *
 * Tables
 * ──────
 *  user                       better-auth required + role / username / bio
 *  session                    better-auth
 *  account                    better-auth OAuth
 *  verification               better-auth email
 *  work                       a piece of writing published on skaddosh
 *  kudos                      appreciation token: reader → work
 *  comment                    comments that spend kudos
 *  userSettings               per-user preferences
 *  project                    showcase project (portfolio item)
 *  galleryCollection          photo/image collection
 *  contentAccess              confidential-content access requests / kudos unlocks
 *  savedItem                  reader bookmarks of works/projects/gallery collections
 *  portfolioProfiles          story-led public portfolio profile + inbox metadata
 *  billingSubscriptions       Paddle subscription state for paid add-ons only
 *  kudosPurchases             one-time Paddle kudos pack purchases
 *  portfolioAnalyticsEvents   portfolio analytics events
 */

import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "reader",
  "creator",
  "publisher",
]);

export const workTypeEnum = pgEnum("work_type", [
  "story",
  "novel",
  "poem",
  "essay",
  "article",
  "journal",
  "script",
  "research",
]);

export const contentVisibilityEnum = pgEnum("content_visibility", [
  "public",
  "confidential",
]);

export const contentUnlockMethodEnum = pgEnum("content_unlock_method", [
  "request",
  "kudos",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "work",
  "project",
  "gallery",
]);

export const contentAccessMethodEnum = pgEnum("content_access_method", [
  "request",
  "kudos",
]);

export const contentAccessStatusEnum = pgEnum("content_access_status", [
  "pending",
  "approved",
  "denied",
  "granted",
]);

// ── better-auth ───────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),

  // platform fields
  role: userRoleEnum("role").notNull().default("reader"),
  username: text("username").unique(),
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  kudosBalance: integer("kudos_balance").notNull().default(25),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("account_provider_account_uidx").on(t.providerId, t.accountId),
    index("account_user_idx").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ── app ───────────────────────────────────────────────────────────────────────

export const work = pgTable(
  "work",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    type: workTypeEnum("type").notNull().default("story"),
    published: boolean("published").notNull().default(false),
    discoverable: boolean("discoverable").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    accentColor: text("accent_color").notNull().default("#6366f1"),
    image: text("image"),
    readingTime: integer("reading_time"),
    kudosCount: integer("kudos_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),

    visibility: contentVisibilityEnum("visibility").notNull().default("public"),
    unlockMethod: contentUnlockMethodEnum("unlock_method").notNull().default("request"),
    kudosPrice: integer("kudos_price").notNull().default(0),

    // Category tags for article targeting, JSON array of strings
    tagsJson: text("tags_json").notNull().default("[]"),

    // Multilingual JSON blobs { ar, en, fr, es }
    titleJson: text("title_json")
      .notNull()
      .default('{"ar":"","en":"","fr":"","es":""}'),
    tagJson: text("tag_json")
      .notNull()
      .default('{"ar":"","en":"","fr":"","es":""}'),

    // AI-generated summaries per language
    summaryJson: text("summary_json")
      .notNull()
      .default('{"ar":"","en":"","fr":"","es":""}'),

    // Body per language
    bodyAr: text("body_ar").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    bodyFr: text("body_fr").notNull().default(""),
    bodyEs: text("body_es").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("work_creator_idx").on(t.creatorId),
    index("work_published_idx").on(t.published),
    index("work_discoverable_idx").on(t.discoverable),
    index("work_type_idx").on(t.type),
  ],
);

export const kudos = pgTable(
  "kudos",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull().default(1),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("kudos_work_idx").on(t.workId)],
);

export const comment = pgTable(
  "comment",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    kudosSpent: integer("kudos_spent").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("comment_work_idx").on(t.workId)],
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredLang: text("preferred_lang").notNull().default("en"),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  profilePublic: boolean("profile_public").notNull().default(true),
  portfolioEnabled: boolean("portfolio_enabled").notNull().default(true),
  showKudosBalance: boolean("show_kudos_balance").notNull().default(true),
  contentCategories: text("content_categories").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ── project ───────────────────────────────────────────────────────────────────

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"), // "draft" | "published"

    coverImage: text("cover_image"),
    images: text("images_json").notNull().default("[]"), // JSON string[]

    url: text("url"),
    repoUrl: text("repo_url"),
    tags: text("tags_json").notNull().default("[]"), // JSON string[]

    accentColor: text("accent_color").notNull().default("#6366f1"),

    visibility: contentVisibilityEnum("visibility").notNull().default("public"),
    unlockMethod: contentUnlockMethodEnum("unlock_method").notNull().default("request"),
    kudosPrice: integer("kudos_price").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("project_creator_idx").on(t.creatorId),
    index("project_status_idx").on(t.status),
  ],
);

// ── gallery collection ────────────────────────────────────────────────────────

export const galleryCollection = pgTable(
  "gallery_collection",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: text("name").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"), // "draft" | "published"

    coverImage: text("cover_image"),
    images: text("images_json").notNull().default("[]"), // JSON {url, caption, alt}[]

    accentColor: text("accent_color").notNull().default("#6366f1"),

    visibility: contentVisibilityEnum("visibility").notNull().default("public"),
    unlockMethod: contentUnlockMethodEnum("unlock_method").notNull().default("request"),
    kudosPrice: integer("kudos_price").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("gallery_collection_creator_idx").on(t.creatorId),
    index("gallery_collection_status_idx").on(t.status),
  ],
);

// ── content access (confidential unlock) ───────────────────────────────────────

export const contentAccess = pgTable(
  "content_access",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    contentType: contentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    method: contentAccessMethodEnum("method").notNull(),
    status: contentAccessStatusEnum("status").notNull().default("pending"),
    kudosSpent: integer("kudos_spent"),
    message: text("message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("content_access_content_user_unique").on(
      t.contentType,
      t.contentId,
      t.userId,
    ),
    index("content_access_content_idx").on(t.contentType, t.contentId),
    index("content_access_user_idx").on(t.userId),
  ],
);

export const contentAccessRelations = relations(contentAccess, ({ one }) => ({
  user: one(user, { fields: [contentAccess.userId], references: [user.id] }),
}));

// ── saved items (bookmarks) ─────────────────────────────────────────────────────

export const savedItem = pgTable(
  "saved_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    contentType: contentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_item_user_content_unique").on(
      t.userId,
      t.contentType,
      t.contentId,
    ),
    index("saved_item_user_idx").on(t.userId),
  ],
);

export const savedItemRelations = relations(savedItem, ({ one }) => ({
  user: one(user, { fields: [savedItem.userId], references: [user.id] }),
}));

// ── portfolio ─────────────────────────────────────────────────────────────────

export const portfolioProfiles = pgTable(
  "portfolio_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    prompt: text("prompt").notNull(),

    profileType: text("profile_type").notNull().default("individual"),
    status: text("status").notNull().default("published"),
    theme: text("theme").notNull().default("skaddosh"),
    published: boolean("published").notNull().default(true),

    // JSON keeps the portfolio shape flexible while the app stabilizes around
    // identity, story, experience, education, skills, contact, inbox, and domain.
    metadata: jsonb("metadata"),

    // Mirrors metadata.customization.customDomain for fast, indexed lookups
    // (e.g. from proxy.ts) without scanning JSONB on every request.
    customDomain: text("custom_domain"),
    customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("portfolio_profile_user_id_unique").on(
      table.userId,
    ),
    usernameUnique: uniqueIndex("portfolio_profile_username_unique").on(
      table.username,
    ),
    usernameIdx: index("portfolio_profile_username_idx").on(table.username),
    customDomainUnique: uniqueIndex("portfolio_profile_custom_domain_unique")
      .on(table.customDomain)
      .where(sql`${table.customDomain} is not null`),
  }),
);

export const portfolioProfileRelations = relations(
  portfolioProfiles,
  ({ one }) => ({
    owner: one(user, {
      fields: [portfolioProfiles.userId],
      references: [user.id],
    }),
  }),
);

// ── billing ───────────────────────────────────────────────────────────────────

export const billingSubscriptions = pgTable(
  "billing_subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("inactive"),

    paddleCustomerId: text("paddle_customer_id"),
    paddleSubscriptionId: text("paddle_subscription_id"),
    paddlePriceId: text("paddle_price_id"),

    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),

    currentPeriodEndsAt: timestamp("current_period_ends_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("billing_subscription_user_id_unique").on(
      table.userId,
    ),
    paddleSubscriptionIdUnique: uniqueIndex(
      "billing_subscription_paddle_subscription_id_unique",
    ).on(table.paddleSubscriptionId),
    paddleCustomerIdIdx: index(
      "billing_subscription_paddle_customer_id_idx",
    ).on(table.paddleCustomerId),
  }),
);

export const billingSubscriptionRelations = relations(
  billingSubscriptions,
  ({ one }) => ({
    owner: one(user, {
      fields: [billingSubscriptions.userId],
      references: [user.id],
    }),
  }),
);

// ── kudos purchases ───────────────────────────────────────────────────────────

export const kudosPurchases = pgTable(
  "kudos_purchase",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    paddleTransactionId: text("paddle_transaction_id"),
    paddlePriceId: text("paddle_price_id"),
    checkoutUrl: text("checkout_url"),

    amount: integer("amount").notNull(),
    status: text("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("kudos_purchase_user_id_idx").on(table.userId),
    paddleTransactionIdUnique: uniqueIndex(
      "kudos_purchase_paddle_transaction_id_unique",
    ).on(table.paddleTransactionId),
    statusIdx: index("kudos_purchase_status_idx").on(table.status),
  }),
);

export const kudosPurchaseRelations = relations(kudosPurchases, ({ one }) => ({
  owner: one(user, {
    fields: [kudosPurchases.userId],
    references: [user.id],
  }),
}));

// ── analytics ─────────────────────────────────────────────────────────────────

export const portfolioAnalyticsEvents = pgTable(
  "portfolio_analytics_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    portfolioProfileId: text("portfolio_profile_id")
      .notNull()
      .references(() => portfolioProfiles.id, { onDelete: "cascade" }),

    eventType: text("event_type").notNull(),
    eventName: text("event_name").notNull(),
    path: text("path").notNull(),

    visitorId: text("visitor_id"),
    referrer: text("referrer"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    profileIdIdx: index("portfolio_analytics_event_profile_id_idx").on(
      table.portfolioProfileId,
    ),
    eventTypeIdx: index("portfolio_analytics_event_event_type_idx").on(
      table.eventType,
    ),
    createdAtIdx: index("portfolio_analytics_event_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const portfolioAnalyticsEventRelations = relations(
  portfolioAnalyticsEvents,
  ({ one }) => ({
    portfolio: one(portfolioProfiles, {
      fields: [portfolioAnalyticsEvents.portfolioProfileId],
      references: [portfolioProfiles.id],
    }),
  }),
);

// ── relations ─────────────────────────────────────────────────────────────────

export const projectRelations = relations(project, ({ one }) => ({
  creator: one(user, { fields: [project.creatorId], references: [user.id] }),
}));

export const galleryCollectionRelations = relations(galleryCollection, ({ one }) => ({
  creator: one(user, { fields: [galleryCollection.creatorId], references: [user.id] }),
}));

export const userRelations = relations(user, ({ many, one }) => ({
  works: many(work),
  projects: many(project),
  galleryCollections: many(galleryCollection),
  kudos: many(kudos),
  comments: many(comment),
  portfolioProfile: one(portfolioProfiles),
  billingSubscription: one(billingSubscriptions),
  kudosPurchases: many(kudosPurchases),
  contentAccess: many(contentAccess),
  savedItems: many(savedItem),
}));

export const workRelations = relations(work, ({ one, many }) => ({
  creator: one(user, {
    fields: [work.creatorId],
    references: [user.id],
  }),
  kudos: many(kudos),
  comments: many(comment),
}));

export const kudosRelations = relations(kudos, ({ one }) => ({
  work: one(work, {
    fields: [kudos.workId],
    references: [work.id],
  }),
  fromUser: one(user, {
    fields: [kudos.fromUserId],
    references: [user.id],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  work: one(work, {
    fields: [comment.workId],
    references: [work.id],
  }),
  fromUser: one(user, {
    fields: [comment.fromUserId],
    references: [user.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));

// ── type exports ──────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type Work = typeof work.$inferSelect;
export type Kudos = typeof kudos.$inferSelect;
export type Comment = typeof comment.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;

export type PortfolioProfile = typeof portfolioProfiles.$inferSelect;
export type BillingSubscription = typeof billingSubscriptions.$inferSelect;
export type KudosPurchase = typeof kudosPurchases.$inferSelect;
export type PortfolioAnalyticsEvent =
  typeof portfolioAnalyticsEvents.$inferSelect;

export type Project = typeof project.$inferSelect;
export type GalleryCollection = typeof galleryCollection.$inferSelect;
export type ContentAccess = typeof contentAccess.$inferSelect;
export type SavedItem = typeof savedItem.$inferSelect;

export type UserRole = "reader" | "creator" | "publisher";

export type WorkType =
  | "story"
  | "novel"
  | "poem"
  | "essay"
  | "article"
  | "journal"
  | "script"
  | "research";

export type ContentVisibility = "public" | "confidential";
export type ContentUnlockMethod = "request" | "kudos";
export type ContentKind = "work" | "project" | "gallery";
export type ContentAccessMethod = "request" | "kudos";
export type ContentAccessStatus = "pending" | "approved" | "denied" | "granted";

export type Lang = "ar" | "en" | "fr" | "es";

export type Multilingual = Record<Lang, string>;
