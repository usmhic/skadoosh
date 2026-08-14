import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@skaddosh/auth/server";
import { sendKudosPurchaseStartedEmail } from "@skaddosh/auth/mailer";
import { db, kudosPurchases } from "@skaddosh/db";

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    status?: string | null;
    checkout?: {
      url?: string | null;
    } | null;
  };
};

const MIN_KUDOS_AMOUNT = 25;
const MAX_KUDOS_AMOUNT = 250;
const KUDOS_AMOUNT_STEP = 25;

function getPaddleBaseUrl() {
  return process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

function getKudosPriceId() {
  return process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? process.env.PADDLE_PRICE_ID;
}

async function paddleApi<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not configured.");

  const response = await fetch(`${getPaddleBaseUrl()}${path}`, {
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

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let amount: unknown;
  try {
    amount = (await request.json())?.amount;
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < MIN_KUDOS_AMOUNT ||
    amount > MAX_KUDOS_AMOUNT ||
    amount % KUDOS_AMOUNT_STEP !== 0
  ) {
    return NextResponse.json({ error: "Choose a Hot Kudos amount between 25 and 250, in steps of 25." }, { status: 400 });
  }

  const packAmount = amount;
  const priceId = getKudosPriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_PADDLE_PRICE_ID is not configured." },
      { status: 500 },
    );
  }

  try {
    const payload = await paddleApi<PaddleTransactionResponse>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        collection_mode: "automatic",
        items: [{ price_id: priceId, quantity: packAmount }],
        custom_data: {
          kind: "kudos",
          userId: session.user.id,
          kudosAmount: packAmount,
        },
      }),
    });

    const transactionId = payload.data?.id;
    const checkoutUrl = payload.data?.checkout?.url;

    if (!transactionId || !checkoutUrl) {
      return NextResponse.json(
        { error: "Paddle did not return a checkout link." },
        { status: 502 },
      );
    }

    await db.insert(kudosPurchases).values({
      userId: session.user.id,
      paddleTransactionId: transactionId,
      paddlePriceId: priceId,
      checkoutUrl,
      amount: packAmount,
      status: payload.data?.status ?? "pending",
    });

    if (session.user.email) {
      await sendKudosPurchaseStartedEmail({
        to: session.user.email,
        name: session.user.name,
        amount: packAmount,
        checkoutUrl,
      });
    }

    return NextResponse.json({ url: checkoutUrl, transactionId });
  } catch (error) {
    console.error("[skaddosh] kudos checkout API failed", error);
    return NextResponse.json(
      { error: "Unable to create Paddle checkout." },
      { status: 502 },
    );
  }
}
