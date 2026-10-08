import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseVeriffDecision, verifyVeriffSignature } from "./identity";

const SECRET = "test-shared-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

describe("Veriff webhook signature", () => {
  beforeEach(() => {
    process.env.VERIFF_SHARED_SECRET = SECRET;
    process.env.VERIFF_API_KEY = "api-key";
  });

  it("accepts the HMAC of the raw body", () => {
    const body = JSON.stringify({ status: "success", verification: { id: "s1", status: "approved" } });
    assert.equal(verifyVeriffSignature(body, sign(body), "api-key"), true);
    assert.equal(verifyVeriffSignature(body, sign(body).toUpperCase(), "api-key"), true);
  });

  it("rejects tampered bodies, wrong keys, and missing signatures", () => {
    const body = JSON.stringify({ verification: { id: "s1", status: "approved" } });
    assert.equal(verifyVeriffSignature(body + " ", sign(body), "api-key"), false);
    assert.equal(verifyVeriffSignature(body, sign(body), "someone-else"), false);
    assert.equal(verifyVeriffSignature(body, null, "api-key"), false);
  });
});

describe("Veriff decision parsing", () => {
  it("keeps only status, country, and reason", () => {
    const decision = parseVeriffDecision({
      status: "success",
      verification: {
        id: "sess-1",
        status: "approved",
        reasonCode: null,
        person: { firstName: "Laila", lastName: "Mansouri", dateOfBirth: "1990-01-01" },
        document: { country: "ma", number: "AB123456", type: "PASSPORT" },
      },
    });
    assert.deepEqual(decision, { sessionId: "sess-1", outcome: "verified", country: "MA", reasonCode: null });
    assert.equal(JSON.stringify(decision).includes("Laila"), false);
    assert.equal(JSON.stringify(decision).includes("AB123456"), false);
  });

  it("maps declines and resubmissions", () => {
    assert.equal(parseVeriffDecision({ verification: { id: "a", status: "declined", reasonCode: 102 } })?.outcome, "rejected");
    assert.equal(parseVeriffDecision({ verification: { id: "a", status: "resubmission_requested" } })?.outcome, "resubmission");
    assert.equal(parseVeriffDecision({ verification: { id: "a", status: "declined", reasonCode: 102 } })?.reasonCode, "102");
  });

  it("ignores payloads that aren't decisions", () => {
    assert.equal(parseVeriffDecision({ action: "started" }), null);
    assert.equal(parseVeriffDecision(null), null);
  });
});
