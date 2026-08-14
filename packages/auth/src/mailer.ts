type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

type MailResult =
  | { ok: true; id?: string }
  | { ok: false; skipped?: boolean; error?: string };

const appName = "skaddosh";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

function getFromAddress() {
  return process.env.EMAIL_FROM;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphs(value: string) {
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function emailShell(title: string, body: string, cta?: { label: string; url: string }) {
  const ctaHtml = cta
    ? `<p><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${escapeHtml(cta.label)}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#111827">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="font-weight:800;font-size:18px;margin-bottom:18px">${appName}</div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 14px">${escapeHtml(title)}</h1>
        <div style="font-size:15px;line-height:1.65;color:#374151">${body}</div>
        ${ctaHtml}
      </div>
      <p style="font-size:12px;line-height:1.5;color:#6b7280;margin-top:16px">You are receiving this email from ${appName}.</p>
    </div>
  </body>
</html>`;
}

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getFromAddress());
}

export async function sendEmail(input: SendEmailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey || !from) {
    console.log(`[skaddosh email skipped] ${input.subject} -> ${input.to}\n${input.text}`);
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[skaddosh email failed] ${input.subject} -> ${input.to}: ${error}`);
      return { ok: false, error };
    }

    const payload = await response.json().catch(() => null) as { id?: string } | null;
    return { ok: true, id: payload?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown mailer error";
    console.error(`[skaddosh email failed] ${input.subject} -> ${input.to}: ${message}`);
    return { ok: false, error: message };
  }
}

export async function sendVerificationEmail(input: { to: string; name?: string | null; url: string }) {
  const firstLine = `Hi ${input.name || "there"}, confirm your email address to finish setting up your ${appName} account.`;
  return sendEmail({
    to: input.to,
    subject: "Verify your skaddosh email",
    text: `${firstLine}\n\nVerify your email: ${input.url}`,
    html: emailShell("Verify your email", paragraphs(firstLine), { label: "Verify email", url: input.url }),
  });
}

export async function sendPasswordResetEmail(input: { to: string; name?: string | null; url: string }) {
  const firstLine = `Hi ${input.name || "there"}, use this secure link to reset your ${appName} password.`;
  return sendEmail({
    to: input.to,
    subject: "Reset your skaddosh password",
    text: `${firstLine}\n\nReset your password: ${input.url}\n\nIf you did not request this, you can ignore this email.`,
    html: emailShell(
      "Reset your password",
      paragraphs(`${firstLine}\nIf you did not request this, you can ignore this email.`),
      { label: "Reset password", url: input.url },
    ),
  });
}

export async function sendKudosPurchaseStartedEmail(input: {
  to: string;
  name?: string | null;
  amount: number;
  checkoutUrl: string;
}) {
  const line = `Hi ${input.name || "there"}, your checkout for ${input.amount} Hot Kudos is ready.`;
  return sendEmail({
    to: input.to,
    subject: `Complete your ${input.amount} Hot Kudos purchase`,
    text: `${line}\n\nCheckout: ${input.checkoutUrl}`,
    html: emailShell("Your Hot Kudos checkout is ready", paragraphs(line), {
      label: "Continue checkout",
      url: input.checkoutUrl,
    }),
  });
}

export async function sendKudosPurchaseCompletedEmail(input: {
  to: string;
  name?: string | null;
  amount: number;
  balance?: number | null;
}) {
  const balanceLine =
    typeof input.balance === "number" ? `Your new balance is ${input.balance} Hot Kudos.` : "Your Hot Kudos balance has been updated.";
  const text = `Hi ${input.name || "there"}, ${input.amount} Hot Kudos have been added to your account.\n${balanceLine}`;
  return sendEmail({
    to: input.to,
    subject: `${input.amount} Hot Kudos added to your account`,
    text,
    html: emailShell("Hot Kudos added", paragraphs(text), { label: "View your profile", url: `${getAppUrl()}/profile` }),
  });
}

export async function sendKudosReceivedEmail(input: {
  to: string;
  creatorName?: string | null;
  senderName?: string | null;
  workTitle: string;
  amount: number;
  message?: string | null;
}) {
  const giver = input.senderName || "A reader";
  const messageLine = input.message ? `\nMessage: ${input.message}` : "";
  const text = `Hi ${input.creatorName || "there"}, ${giver} sent ${input.amount} Hot Kudos to "${input.workTitle}".${messageLine}`;
  return sendEmail({
    to: input.to,
    subject: `${giver} sent Hot Kudos for ${input.workTitle}`,
    text,
    html: emailShell("You received Hot Kudos", paragraphs(text)),
  });
}

export async function sendCommentReceivedEmail(input: {
  to: string;
  creatorName?: string | null;
  commenterName?: string | null;
  workTitle: string;
  comment: string;
}) {
  const commenter = input.commenterName || "A reader";
  const text = `Hi ${input.creatorName || "there"}, ${commenter} commented on "${input.workTitle}".\n\n${input.comment}`;
  return sendEmail({
    to: input.to,
    subject: `New comment on ${input.workTitle}`,
    text,
    html: emailShell("New comment on your work", paragraphs(text)),
  });
}
