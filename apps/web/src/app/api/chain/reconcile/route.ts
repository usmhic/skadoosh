import { NextResponse } from "next/server";
import { reconcileChainOps, secureCompare } from "@skaddosh/api";

/**
 * Settles submitted on-chain operations and retries pending ones (mints, burns, attestations).
 * Call it from any scheduler every few minutes with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !secureCompare(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await reconcileChainOps();
  return NextResponse.json(result);
}
