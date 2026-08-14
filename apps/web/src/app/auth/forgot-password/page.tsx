"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "@/lib/auth";
import { Button }   from "@skaddosh/ui/components/ui/button";
import { Input }    from "@skaddosh/ui/components/ui/input";
import { Label }    from "@skaddosh/ui/components/ui/label";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { LoaderIcon, MailCheckIcon, ArrowLeftIcon } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (res.error) setError(res.error.message ?? t("auth.genericError"));
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MailCheckIcon className="size-10 text-primary" />
        <h1 className="text-xl font-semibold">{t("auth.checkInbox")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.forgotSuccessText")} {" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
        <Button variant="ghost" size="sm" asChild className="mt-2">
          <Link href="/auth/login"><ArrowLeftIcon className="size-4 mr-1" />{t("auth.backToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">{t("auth.resetPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.resetPasswordSubtitle")}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <LoaderIcon className="size-4 animate-spin mr-2" />}
          {t("auth.sendReset")}
        </Button>
      </form>

      <Separator className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-foreground hover:underline underline-offset-4 inline-flex items-center gap-1">
          <ArrowLeftIcon className="size-3" /> {t("auth.backToSignIn")}
        </Link>
      </p>
    </>
  );
}
