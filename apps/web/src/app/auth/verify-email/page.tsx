"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { Button } from "@skaddosh/ui/components/ui/button";
import { LoaderIcon, MailIcon, CheckCircleIcon } from "lucide-react";

function VerifyEmailContent() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const email  = params.get("email") ?? "";
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function resend() {
    if (!email) return;
    setLoading(true); setError(""); setSent(false);
    try {
      const res = await authClient.sendVerificationEmail({ email, callbackURL: "/read" });
      if ((res as { error?: { message?: string } }).error)
        throw new Error((res as { error: { message?: string } }).error.message ?? t("auth.genericError"));
      setSent(true);
    } catch (e: unknown) {
      setError((e as Error).message ?? t("auth.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/10">
          {sent ? <CheckCircleIcon className="size-7 text-green-500" /> : <MailIcon className="size-7" />}
        </div>
        <h1 className="text-xl font-semibold">{t("auth.checkInbox")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("auth.verifySentTo")} {" "}
          {email && <span className="font-medium text-foreground">{email}</span>}.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {sent && (
        <p className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {t("auth.emailSentAgain")}
        </p>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading || !email}
          onClick={resend}
        >
          {loading && <LoaderIcon className="mr-2 size-4 animate-spin" />}
          {t("auth.resendVerification")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="hover:underline underline-offset-4">
            ← {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
