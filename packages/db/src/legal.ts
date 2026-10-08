/**
 * Versioned legal templates for licences and contributor agreements.
 *
 * The exact rendered text a party accepts is hashed (SHA-256) and stored on the licence or
 * contributor row, and attested on-chain, so the wording must never change within a version.
 * To change wording, add a new version and keep the old one for existing records.
 *
 * These templates are deliberately short and plain. Have them reviewed by counsel in each launch
 * market before production (docs/RESEARCH.md §7).
 */

export type LicenseTierKey = "personal" | "commercial" | "exclusive";

export const LICENSE_TERMS_VERSION = "2026-10";
export const CONTRIBUTOR_AGREEMENT_VERSION = "2026-10";

export const LICENSE_TIER_INFO: Record<
  LicenseTierKey,
  { label: string; summary: string; allows: string[]; forbids: string[] }
> = {
  personal: {
    label: "Personal",
    summary: "Enjoy and use the work privately.",
    allows: ["Personal, non-commercial use", "Display on your own devices and personal pages, with credit"],
    forbids: ["Any commercial use", "Reselling or redistributing the work", "Training AI models on the work"],
  },
  commercial: {
    label: "Commercial",
    summary: "Use the work in your products, campaigns, and client projects.",
    allows: [
      "Commercial use in products, marketing, and client work",
      "Modifying the work for those uses",
      "Worldwide, with no time limit",
    ],
    forbids: [
      "Reselling or redistributing the work on its own",
      "Claiming authorship",
      "Training AI models on the work",
    ],
  },
  exclusive: {
    label: "Exclusive",
    summary: "Commercial rights, and nobody else can buy new ones.",
    allows: [
      "Everything in Commercial",
      "The creator stops issuing new Commercial and Exclusive licences",
    ],
    forbids: [
      "Reselling or redistributing the work on its own",
      "Claiming authorship",
      "Training AI models on the work",
    ],
  },
};

export type LicenseTermsInput = {
  tier: LicenseTierKey;
  certificateCode: string;
  workTitle: string;
  creatorName: string;
  licenseeName: string;
  issuedAt: Date;
};

/** The full licence document. Its SHA-256 is the licence's terms hash. */
export function renderLicenseTerms(input: LicenseTermsInput): string {
  const info = LICENSE_TIER_INFO[input.tier];
  const date = input.issuedAt.toISOString().slice(0, 10);
  return [
    `skaddosh ${info.label} Licence — version ${LICENSE_TERMS_VERSION}`,
    `Certificate: ${input.certificateCode}`,
    `Work: "${input.workTitle}"`,
    `Licensor (creator): ${input.creatorName}`,
    `Licensee: ${input.licenseeName}`,
    `Date: ${date}`,
    "",
    `1. Grant. The licensor grants the licensee a non-transferable licence to use the work as follows: ${info.allows.join("; ")}.`,
    `2. Restrictions. The licensee may not: ${info.forbids.join("; ")}.`,
    "3. Ownership. This is a licence to use the work. Copyright and all rights not expressly granted stay with the licensor and any recorded co-owners. Buying a licence does not transfer ownership.",
    input.tier === "exclusive"
      ? "4. Exclusivity. From the date above, the licensor will not issue new Commercial or Exclusive licences for the work. Licences issued before this date remain valid."
      : "4. Non-exclusivity. The licensor may license the work to others.",
    "5. Attribution. Where reasonable, credit the work as: \"<title> by <creator>, licensed via skaddosh\".",
    "6. Warranty. The licensor confirms the work is their original creation, made by people, and that they have the right to grant this licence.",
    "7. Termination. This licence ends automatically if the licensee breaches it. Uses made before termination in line with this licence remain valid.",
    "8. Verification. This certificate's terms hash is recorded with skaddosh and may be attested on a public blockchain. Anyone can verify it at skaddosh.",
  ].join("\n");
}

export type ContributorAgreementInput = {
  projectTitle: string;
  creatorName: string;
  contributorName: string;
  role: string;
  contribution: string;
  splitBps: number;
  coOwner: boolean;
};

/** The agreement both parties accept. Its SHA-256 is the contributor row's agreement hash. */
export function renderContributorAgreement(input: ContributorAgreementInput): string {
  const percent = (input.splitBps / 100).toFixed(2).replace(/\.00$/, "");
  return [
    `skaddosh Contributor Agreement — version ${CONTRIBUTOR_AGREEMENT_VERSION}`,
    `Project: "${input.projectTitle}"`,
    `Creator: ${input.creatorName}`,
    `Contributor: ${input.contributorName}`,
    `Role: ${input.role}`,
    input.contribution ? `Contribution: ${input.contribution}` : "Contribution: as described on the project page",
    "",
    `1. Credit. The contributor will be credited on the project as "${input.role}".`,
    input.splitBps > 0
      ? `2. Revenue share. The contributor receives ${percent}% of the creator's share of Kudos the project earns on skaddosh (gifts, licences, unlocks) from the date of acceptance, paid automatically.`
      : "2. Revenue share. None. This agreement is for credit only.",
    input.coOwner
      ? "3. Co-ownership. The parties intend to co-own the copyright in the contributed parts. Formal assignment or registration of copyright may require a separate signed instrument under applicable law."
      : "3. Ownership. The contributor keeps copyright in their own contribution and grants the creator a perpetual, worldwide, royalty-free licence to use it as part of the project.",
    "4. Originality. Each party confirms their contribution is their own original work, made by people.",
    "5. Changes. Either party may end future revenue sharing by written notice on skaddosh. Shares already paid are not reversed.",
    "6. Not an investment. This agreement compensates creative work. It is not a security, loan, or investment, and no money is paid in to obtain it.",
  ].join("\n");
}
