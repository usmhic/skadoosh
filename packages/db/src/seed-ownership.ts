/**
 * Demo data for ownership features: mediums, verified creators, licence offers, issued licences,
 * and contributor agreements. Idempotent: fixed ids and conflict-skips throughout.
 */
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  identityVerification,
  kudosLedger,
  license,
  licenseOffer,
  project,
  projectContributor,
  user,
  type LicenseTier,
  type Medium,
} from "./index";
import {
  CONTRIBUTOR_AGREEMENT_VERSION,
  LICENSE_TERMS_VERSION,
  renderContributorAgreement,
  renderLicenseTerms,
} from "./legal";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

/** Mirrors LICENSE_PLATFORM_FEE_BPS in packages/api/src/lib/licensing.ts. */
const PLATFORM_FEE_BPS = 1_000;

const MEDIUM_BY_PROJECT: Record<string, Medium> = {
  proj_salt_atlas: "art",
  proj_late_trains: "writing",
  proj_quiet_tools: "software",
  proj_bureau_lost_forms: "film",
  proj_zellige_type: "design",
  proj_night_shift: "writing",
  proj_two_shores: "music",
};

/** Demo creators with a verified identity, by document country. */
const VERIFIED_USERS: Array<[userId: string, country: string]> = [
  ["user_al_hishu", "MA"],
  ["user_nora_vale", "PT"],
  ["user_omar_haddad", "MA"],
  ["user_laila_mansouri", "MA"],
  ["user_sam_rivera", "ES"],
  ["user_mina_park", "KR"],
  ["user_yanis_benali", "FR"],
  ["user_hana_sato", "JP"],
  ["user_salma_idrissi", "MA"],
];

const OFFERS: Array<[projectId: string, tier: LicenseTier, price: number]> = [
  ["proj_salt_atlas", "personal", 20],
  ["proj_salt_atlas", "commercial", 250],
  ["proj_quiet_tools", "personal", 10],
  ["proj_quiet_tools", "commercial", 150],
  ["proj_zellige_type", "personal", 15],
  ["proj_zellige_type", "commercial", 300],
  ["proj_zellige_type", "exclusive", 2500],
  ["proj_two_shores", "personal", 8],
  ["proj_two_shores", "commercial", 120],
];

type DemoContributor = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  contribution: string;
  splitBps: number;
  coOwner: boolean;
  status: "accepted" | "invited" | "requested";
  initiatedBy: "creator" | "contributor";
  daysAgo: number;
};

const CONTRIBUTORS: DemoContributor[] = [
  {
    id: "contrib_salt_atlas_hana",
    projectId: "proj_salt_atlas",
    userId: "user_hana_sato",
    role: "Translator",
    contribution: "Translated six oral histories into English and Japanese.",
    splitBps: 1_500,
    coOwner: false,
    status: "accepted",
    initiatedBy: "creator",
    daysAgo: 18,
  },
  {
    id: "contrib_salt_atlas_omar",
    projectId: "proj_salt_atlas",
    userId: "user_omar_haddad",
    role: "Map lettering",
    contribution: "Hand-lettered place names for all twelve plates.",
    splitBps: 1_000,
    coOwner: true,
    status: "accepted",
    initiatedBy: "contributor",
    daysAgo: 9,
  },
  {
    id: "contrib_zellige_laila",
    projectId: "proj_zellige_type",
    userId: "user_laila_mansouri",
    role: "Arabic type consultant",
    contribution: "Review of joining behaviour and kashida.",
    splitBps: 500,
    coOwner: false,
    status: "requested",
    initiatedBy: "contributor",
    daysAgo: 2,
  },
  {
    id: "contrib_bureau_mina",
    projectId: "proj_bureau_lost_forms",
    userId: "user_mina_park",
    role: "Storyboard artist",
    contribution: "Forty storyboard panels.",
    splitBps: 2_000,
    coOwner: false,
    status: "invited",
    initiatedBy: "creator",
    daysAgo: 1,
  },
];

const LICENSES: Array<{
  id: string;
  code: string;
  projectId: string;
  buyerId: string;
  tier: LicenseTier;
  price: number;
  daysAgo: number;
}> = [
  { id: "license_demo_1", code: "SKD-QT7-C4M9", projectId: "proj_quiet_tools", buyerId: "user_salma_idrissi", tier: "commercial", price: 150, daysAgo: 12 },
  { id: "license_demo_2", code: "SKD-TS2-P8X3", projectId: "proj_two_shores", buyerId: "user_hana_sato", tier: "personal", price: 8, daysAgo: 4 },
];

async function nameOf(userId: string) {
  const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.name ?? "Unknown";
}

export async function insertOwnershipDemo() {
  for (const [projectId, medium] of Object.entries(MEDIUM_BY_PROJECT)) {
    await db.update(project).set({ medium }).where(eq(project.id, projectId));
  }

  for (const [userId, country] of VERIFIED_USERS) {
    const inserted = await db
      .insert(identityVerification)
      .values({
        id: `idv_seed_${userId}`,
        userId,
        provider: "seed",
        providerSessionId: `seed-${userId}`,
        status: "verified",
        country,
        createdAt: daysAgo(100),
        decidedAt: daysAgo(100),
      })
      .onConflictDoNothing()
      .returning({ id: identityVerification.id });
    if (inserted.length) {
      await db
        .update(user)
        .set({ verificationStatus: "verified", verifiedAt: daysAgo(100), verifiedCountry: country })
        .where(eq(user.id, userId));
    }
  }

  for (const [projectId, tier, priceKudos] of OFFERS) {
    await db
      .insert(licenseOffer)
      .values({ id: `offer_${projectId}_${tier}`, projectId, tier, priceKudos })
      .onConflictDoNothing();
  }

  for (const c of CONTRIBUTORS) {
    const [proj] = await db.select().from(project).where(eq(project.id, c.projectId)).limit(1);
    if (!proj) continue;
    const agreement = renderContributorAgreement({
      projectTitle: proj.title,
      creatorName: await nameOf(proj.creatorId),
      contributorName: await nameOf(c.userId),
      role: c.role,
      contribution: c.contribution,
      splitBps: c.splitBps,
      coOwner: c.coOwner,
    });
    await db
      .insert(projectContributor)
      .values({
        id: c.id,
        projectId: c.projectId,
        userId: c.userId,
        role: c.role,
        contribution: c.contribution,
        splitBps: c.splitBps,
        coOwner: c.coOwner,
        status: c.status,
        initiatedBy: c.initiatedBy,
        agreementVersion: CONTRIBUTOR_AGREEMENT_VERSION,
        agreementText: agreement,
        agreementHash: sha256(agreement),
        acceptedAt: c.status === "accepted" ? daysAgo(c.daysAgo) : null,
        createdAt: daysAgo(c.daysAgo + 1),
        updatedAt: daysAgo(c.daysAgo),
      })
      .onConflictDoNothing();
  }

  for (const l of LICENSES) {
    const [proj] = await db.select().from(project).where(eq(project.id, l.projectId)).limit(1);
    if (!proj) continue;
    const existing = await db.select({ id: license.id }).from(license).where(eq(license.id, l.id)).limit(1);
    if (existing.length) continue;

    const issuedAt = daysAgo(l.daysAgo);
    const creatorName = await nameOf(proj.creatorId);
    const licenseeName = await nameOf(l.buyerId);
    const terms = renderLicenseTerms({
      tier: l.tier,
      certificateCode: l.code,
      workTitle: proj.title,
      creatorName,
      licenseeName,
      issuedAt,
    });
    const fee = Math.floor((l.price * PLATFORM_FEE_BPS) / 10_000);

    await db.insert(license).values({
      id: l.id,
      certificateCode: l.code,
      projectId: proj.id,
      projectTitle: proj.title,
      creatorId: proj.creatorId,
      creatorName,
      buyerId: l.buyerId,
      licenseeName,
      tier: l.tier,
      priceKudos: l.price,
      platformFeeKudos: fee,
      termsVersion: LICENSE_TERMS_VERSION,
      termsHash: sha256(terms),
      createdAt: issuedAt,
    });
    await db
      .insert(kudosLedger)
      .values([
        { id: `ledger_${l.id}_spend`, userId: l.buyerId, currency: "hot", delta: -l.price, kind: "license_spend", projectId: proj.id, counterpartyId: proj.creatorId, createdAt: issuedAt },
        { id: `ledger_${l.id}_earn`, userId: proj.creatorId, currency: "hot", delta: l.price - fee, kind: "license_earn", projectId: proj.id, counterpartyId: l.buyerId, createdAt: issuedAt },
      ])
      .onConflictDoNothing();
  }
}

export const DEMO_LICENSE_COUNT = LICENSES.length;
