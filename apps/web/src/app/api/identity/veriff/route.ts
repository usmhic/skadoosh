import { NextResponse } from "next/server";
import { applyDecision, parseVeriffDecision, verifyVeriffSignature } from "@skaddosh/api";

/**
 * Veriff decision webhook. Only signature-verified requests are accepted, and only the decision
 * status, document country, and reason code are kept (docs/IDENTITY.md).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = verifyVeriffSignature(
    rawBody,
    request.headers.get("x-hmac-signature"),
    request.headers.get("x-auth-client"),
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const decision = parseVeriffDecision(body);
  // Acknowledge events we don't act on (e.g. session started) so Veriff doesn't retry them.
  if (!decision) return NextResponse.json({ ok: true, ignored: true });

  const result = await applyDecision({ provider: "veriff", ...decision });
  return NextResponse.json({ ok: true, matched: result.matched });
}
