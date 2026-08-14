"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { signIn } from "@/lib/auth";
import { SsoButtons } from "@/components/sso-buttons";
import { Button }   from "@skaddosh/ui/components/ui/button";
import { Input }    from "@skaddosh/ui/components/ui/input";
import { Label }    from "@skaddosh/ui/components/ui/label";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { EyeIcon, EyeOffIcon, LoaderIcon } from "lucide-react";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn.email({ email, password: pw });
    setLoading(false);
    if (res.error) {
      const msg = res.error.message ?? "";
      if (msg.toLowerCase().includes("verif")) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(msg || t("auth.signInFailed"));
    } else {
      router.push("/read");
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">{t("auth.welcomeBack")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors">
              {t("common.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <LoaderIcon className="size-4 animate-spin mr-2" />}
          {t("common.signIn")}
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
        {t("common.noAccount")} {" "}
        <Link href="/auth/signup" className="font-medium text-foreground hover:underline underline-offset-4">{t("common.signUp")}</Link>
      </p>
    </>
  );
}
