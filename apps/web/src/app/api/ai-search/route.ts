import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { billingSubscriptions, db, portfolioProfiles } from "@skaddosh/db";

type AiSearchRequest = {
  username?: string;
  question?: string;
  context?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

function clip(value: string, max = 12000) {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function extractResponseText(payload: {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

async function isPremiumPortfolio(username: string) {
  const [profile] = await db
    .select({ userId: portfolioProfiles.userId })
    .from(portfolioProfiles)
    .where(eq(portfolioProfiles.username, username))
    .limit(1);

  if (!profile) return false;

  const [billing] = await db
    .select({ status: billingSubscriptions.status })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.userId, profile.userId))
    .limit(1);

  return ["active", "trialing", "past_due"].includes(billing?.status ?? "");
}

export async function POST(request: Request) {
  const body = (await request.json()) as AiSearchRequest;
  const username = body.username?.trim().toLowerCase();
  const question = body.question?.trim();

  if (!username) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 });
  }

  if (!(await isPremiumPortfolio(username))) {
    return NextResponse.json({ error: "AI search is available on Premium portfolios only." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const context = clip(body.context?.trim() || "", 14000);
  const history = (body.history ?? []).slice(-6);
  const transcript = history
    .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`)
    .join("\n");

  const input = [
    `Portfolio username: ${username}`,
    context ? `Portfolio context:\n${context}` : "",
    transcript ? `Conversation so far:\n${transcript}` : "",
    `Latest user question: ${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      instructions:
        "You are a portfolio assistant embedded in a public portfolio. Answer only using the provided portfolio context. Be concise, helpful, and specific. If the answer is not supported by the provided context, say that clearly and suggest what to ask instead.",
      input,
      text: {
        verbosity: "low",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `OpenAI request failed: ${await response.text()}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    answer: extractResponseText(await response.json()) || "I could not generate an answer from the portfolio context.",
  });
}
