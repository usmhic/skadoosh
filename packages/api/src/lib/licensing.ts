import { createHash, randomInt } from "node:crypto";
import {
  CONTRIBUTOR_AGREEMENT_VERSION,
  LICENSE_TERMS_VERSION,
  renderContributorAgreement,
  renderLicenseTerms,
  type ContributorAgreementInput,
  type LicenseTermsInput,
} from "@skaddosh/db/legal";

export { LICENSE_TERMS_VERSION, CONTRIBUTOR_AGREEMENT_VERSION };

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Unambiguous alphabet (no 0/O, 1/I/L) for codes people read aloud or type. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** A human-friendly certificate code, e.g. SKD-7QK-M3PX. */
export function certificateCode(): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `SKD-${pick(3)}-${pick(4)}`;
}

export function licenseTerms(input: LicenseTermsInput) {
  const text = renderLicenseTerms(input);
  return { text, hash: sha256Hex(text), version: LICENSE_TERMS_VERSION };
}

export function contributorAgreement(input: ContributorAgreementInput) {
  const text = renderContributorAgreement(input);
  return { text, hash: sha256Hex(text), version: CONTRIBUTOR_AGREEMENT_VERSION };
}
