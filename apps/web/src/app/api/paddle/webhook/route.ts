import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { sendKudosPurchaseCompletedEmail } from "@skaddosh/auth/mailer";
import { billingSubscriptions, db, kudosPurchases, user } from "@skaddosh/db";

type PaddleSubscriptionEvent = {
  event_type: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string | null;
    custom_data?: {
      kind?: string;
      userId?: string;
      kudosAmount?: number | string;
    } | null;
    items?: Array<{
      quantity?: number | string | null;
      price?: {
        id?: string | null;
      } | null;
    }>;
    scheduled_change?: {
      action?: string | null;
    } | null;
    current_billing_period?: {
      ends_at?: string | null;
    } | null;
  };
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not configured.");
  }

  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((entry) => {
      const [key, value] = entry.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.ts;
  const signatures = (parts.h1 ?? "").split(",").filter(Boolean);

  if (!timestamp || signatures.length === 0) return false;
  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;

  const digest = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");
  const digestBuffer = Uint8Array.from(Buffer.from(digest, "hex"));

  return signatures.some((signature: string) => {
    const signatureBuffer = Uint8Array.from(Buffer.from(signature, "hex"));
    return signatureBuffer.length === digestBuffer.length && timingSafeEqual(signatureBuffer, digestBuffer);
  });
}

async function getBillingByPaddleSubscriptionId(subscriptionId: string) {
  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.paddleSubscriptionId, subscriptionId))
    .limit(1);

  return subscription ?? null;
}

function parsePositiveInteger(value?: number | string | null) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return null;
}

async function grantKudosForTransaction(data: NonNullable<PaddleSubscriptionEvent["data"]>) {
  if (data.custom_data?.kind !== "kudos" || !data.id || !data.custom_data.userId) return;

  const amount =
    parsePositiveInteger(data.custom_data.kudosAmount) ??
    parsePositiveInteger(data.items?.[0]?.quantity);
  if (!amount) return;

  const [existingPurchase] = await db
    .select()
    .from(kudosPurchases)
    .where(eq(kudosPurchases.paddleTransactionId, data.id))
    .limit(1);

  if (existingPurchase?.status === "completed") return;

  await db.transaction(async (tx) => {
    if (existingPurchase) {
      await tx
        .update(kudosPurchases)
        .set({
          amount,
          status: "completed",
          paddlePriceId: data.items?.[0]?.price?.id ?? existingPurchase.paddlePriceId,
          updatedAt: new Date(),
        })
        .where(eq(kudosPurchases.id, existingPurchase.id));
    } else {
      await tx.insert(kudosPurchases).values({
        userId: data.custom_data!.userId!,
        paddleTransactionId: data.id,
        paddlePriceId: data.items?.[0]?.price?.id ?? null,
        amount,
        status: "completed",
      });
    }

    await tx
      .update(user)
      .set({
        kudosBalance: sql`${user.kudosBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(user.id, data.custom_data!.userId!));
  });

  const [recipient] = await db
    .select({
      email: user.email,
      name: user.name,
      kudosBalance: user.kudosBalance,
    })
    .from(user)
    .where(eq(user.id, data.custom_data.userId))
    .limit(1);

  if (recipient?.email) {
    await sendKudosPurchaseCompletedEmail({
      to: recipient.email,
      name: recipient.name,
      amount,
      balance: recipient.kudosBalance,
    });
  }
}

async function upsertBillingSubscription(input: {
  userId: string;
  status: string;
  paddleCustomerId?: string | null;
  paddleSubscriptionId?: string | null;
  paddlePriceId?: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt?: Date | null;
}) {
  const [existing] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.userId, input.userId))
    .limit(1);

  if (existing) {
    await db
      .update(billingSubscriptions)
      .set({
        plan: "premium",
        status: input.status,
        paddleCustomerId: input.paddleCustomerId ?? existing.paddleCustomerId,
        paddleSubscriptionId: input.paddleSubscriptionId ?? existing.paddleSubscriptionId,
        paddlePriceId: input.paddlePriceId ?? existing.paddlePriceId,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEndsAt: input.currentPeriodEndsAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.userId, input.userId));

    return;
  }

  await db.insert(billingSubscriptions).values({
    userId: input.userId,
    plan: "premium",
    status: input.status,
    paddleCustomerId: input.paddleCustomerId ?? null,
    paddleSubscriptionId: input.paddleSubscriptionId ?? null,
    paddlePriceId: input.paddlePriceId ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    currentPeriodEndsAt: input.currentPeriodEndsAt ?? null,
  });
}

async function updateKudosPurchaseStatus(transactionId: string, status: string) {
  await db
    .update(kudosPurchases)
    .set({ status, updatedAt: new Date() })
    .where(eq(kudosPurchases.paddleTransactionId, transactionId));
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    if (!verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"))) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  } catch (error) {
    console.error("[skaddosh] webhook signature verification failed", error);
    return NextResponse.json(
      { error: "Webhook verification failed." },
      { status: 500 },
    );
  }

  let payload: PaddleSubscriptionEvent;
  try {
    payload = JSON.parse(rawBody) as PaddleSubscriptionEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data = payload.data;
  if (!data?.id) return NextResponse.json({ ok: true });

  if (payload.event_type === "transaction.completed") {
    await grantKudosForTransaction(data);
    return NextResponse.json({ ok: true });
  }

  if (
    payload.event_type === "transaction.canceled" ||
    payload.event_type === "transaction.payment_failed" ||
    payload.event_type === "transaction.past_due"
  ) {
    await updateKudosPurchaseStatus(data.id, data.status ?? payload.event_type.replace("transaction.", ""));
    return NextResponse.json({ ok: true });
  }

  const existing = await getBillingByPaddleSubscriptionId(data.id);
  const userId = data.custom_data?.userId ?? existing?.userId;
  if (!userId) return NextResponse.json({ ok: true });

  if (
    payload.event_type === "subscription.created" ||
    payload.event_type === "subscription.updated" ||
    payload.event_type === "subscription.resumed" ||
    payload.event_type === "subscription.past_due" ||
    payload.event_type === "subscription.paused"
  ) {
    await upsertBillingSubscription({
      userId,
      status: data.status ?? "inactive",
      paddleCustomerId: data.customer_id ?? null,
      paddleSubscriptionId: data.id,
      paddlePriceId: data.items?.[0]?.price?.id ?? null,
      cancelAtPeriodEnd: data.scheduled_change?.action === "cancel",
      currentPeriodEndsAt: parseDate(data.current_billing_period?.ends_at),
    });
  }

  if (payload.event_type === "subscription.canceled") {
    await upsertBillingSubscription({
      userId,
      status: data.status ?? "canceled",
      paddleCustomerId: data.customer_id ?? null,
      paddleSubscriptionId: data.id,
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: null,
    });
  }

  return NextResponse.json({ ok: true });
}
