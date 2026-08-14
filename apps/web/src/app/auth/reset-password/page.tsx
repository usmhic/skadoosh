"use client";
import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { resetPassword } from "@/lib/auth";
import { Button }   from "@skaddosh/ui/components/ui/button";
import { Input }    from "@skaddosh/ui/components/ui/input";
import { Label }    from "@skaddosh/ui/components/ui/label";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { LoaderIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

function ResetForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") ?? "";

  const [pw, setPw]       = useState("");
  const [pw2, setPw2]     = useState("");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{t("auth.invalidResetToken")}</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth/forgot-password">{t("auth.requestNewLink")}</Link>
        </Button>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { setError(t("auth.passwordsDontMatch")); return; }
    if (pw.length < 8) { setError(t("auth.passwordMin")); return; }
    setLoading(true); setError("");
    const res = await resetPassword({ newPassword: pw, token });
    setLoading(false);
    if (res.error) setError(res.error.message ?? t("auth.genericError"));
    else { setDone(true); setTimeout(() => router.push("/auth/login"), 2000); }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircleIcon className="size-10 text-green-500" />
        <h1 className="text-xl font-semibold">{t("auth.passwordUpdated")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.redirectingToSignIn")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">{t("auth.setNewPassword")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.chooseNewPassword")}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pw">{t("auth.newPassword")}</Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} required placeholder="••••••••"
              value={pw} onChange={e => setPw(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw2">{t("auth.confirmPassword")}</Label>
          <Input id="pw2" type={show ? "text" : "password"} required placeholder="••••••••"
            value={pw2} onChange={e => setPw2(e.target.value)} />
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || pw.length < 8}>
          {loading && <LoaderIcon className="size-4 animate-spin mr-2" />}
          {t("auth.updatePassword")}
        </Button>
      </form>

      <Separator className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-foreground hover:underline underline-offset-4">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
