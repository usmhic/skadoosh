"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { SsoButtons } from "@/components/sso-buttons";
import { Button }   from "@skaddosh/ui/components/ui/button";
import { Input }    from "@skaddosh/ui/components/ui/input";
import { Label }    from "@skaddosh/ui/components/ui/label";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { LoaderIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return;
    setLoading(true); setError("");
    const res = await authClient.signUp.email({ name, email, password: pw });
    setLoading(false);
    if (res.error) setError(res.error.message ?? t("auth.signUpFailed"));
    else router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">{t("auth.createAccountTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.createAccountSubtitle")}</p>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("common.fullName")}</Label>
          <Input id="name" type="text" required placeholder={t("auth.fullNamePlaceholder")} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required placeholder={t("auth.emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">{t("common.password")} <span className="text-xs text-muted-foreground font-normal">({t("auth.passwordMin")})</span></Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} required placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || pw.length < 8}>
          {loading && <LoaderIcon className="size-4 animate-spin mr-2" />}
          {t("common.signUp")}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t("common.orContinueWith")}</span>
        </div>
      </div>

      <SsoButtons redirectTo="/read" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("common.haveAccount")} {" "}
        <Link href="/auth/login" className="font-medium text-foreground hover:underline underline-offset-4">{t("common.signIn")}</Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Link href="/auth/forgot-password" className="font-medium text-foreground hover:underline underline-offset-4">{t("common.forgotPassword")}</Link>
      </p>
    </>
  );
}
