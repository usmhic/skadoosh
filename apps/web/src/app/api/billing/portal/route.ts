import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@skaddosh/auth/server";
import { billingSubscriptions, db } from "@skaddosh/db";

type PaddleSubscriptionResponse = {
  data?: {
    management_urls?: {
      update_payment_method?: string;
      cancel?: string;
    } | null;
  };
};

type PaddlePortalSessionResponse = {
  data?: {
    urls?: {
      general?: {
        overview?: string | null;
      } | null;
    } | null;
  };
};

async function paddleApi<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not configured.");

  const baseUrl = process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Paddle API request failed (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [billing] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.userId, session.user.id))
    .limit(1);

  if (!billing?.paddleSubscriptionId && !billing?.paddleCustomerId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  try {
    if (billing.paddleCustomerId) {
      const payload = await paddleApi<PaddlePortalSessionResponse>(
        `/customers/${billing.paddleCustomerId}/portal-sessions`,
        {
          method: "POST",
          body: JSON.stringify(
            billing.paddleSubscriptionId
              ? { subscription_ids: [billing.paddleSubscriptionId] }
              : {},
          ),
        },
      );
      const url = payload.data?.urls?.general?.overview;
      if (url) return NextResponse.json({ url });
    }

    if (!billing.paddleSubscriptionId) {
      return NextResponse.json({ error: "No subscription link available." }, { status: 404 });
    }

    const payload = await paddleApi<PaddleSubscriptionResponse>(`/subscriptions/${billing.paddleSubscriptionId}`);
    const url = payload.data?.management_urls?.update_payment_method ?? payload.data?.management_urls?.cancel;

    if (!url) {
      return NextResponse.json({ error: "No management link returned by Paddle." }, { status: 404 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[skaddosh] billing portal API failed", error);
    return NextResponse.json(
      { error: "Unable to open the Paddle customer portal." },
      { status: 502 },
    );
  }
}
