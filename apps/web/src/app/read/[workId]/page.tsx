"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { useSession } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { useTranslation } from "react-i18next";
import { Button }    from "@skaddosh/ui/components/ui/button";
import { Badge }     from "@skaddosh/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@skaddosh/ui/components/ui/dialog";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { cn } from "@skaddosh/ui/lib/utils";
import { ArrowLeftIcon, ClockIcon, SparklesIcon, TagIcon, Loader2Icon } from "lucide-react";
import { SEED_WORKS, SEED_CREATOR } from "@skaddosh/db/seed-data";
import { BodyContent } from "@/components/body-content";
import type { Lang } from "@skaddosh/db/schema";
const LANG_ORDER: Lang[] = ["ar", "en", "fr", "es"];
const LANG_LABEL: Record<Lang, string> = { ar: "Arabic", en: "English", fr: "French", es: "Spanish" };

function KudosHistory({ workId, lang }: { workId: string; lang: Lang }) {
  const { data: history } = trpc.works.getKudos.useQuery({ workId, limit: 50 });
  const { t } = useTranslation();
  const rtl = lang === "ar";

  return (
    <div className="mt-10">
      <Separator className="mb-6" />
      <h3 className={cn("mb-4 text-sm font-semibold", rtl && "text-right font-arabic")}>{t("read.kudosActivity")}</h3>
      <div className="space-y-3">
        {history?.map((k) => (
          <div key={k.id} className={cn("rounded-lg border border-border bg-card p-3", rtl && "text-right") }>
            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", rtl && "flex-row-reverse justify-end")}>
              <span className="font-medium text-foreground">{k.giver?.name ?? t("common.anonymous")}</span>
              <span className="inline-flex items-center gap-1"><KudosIcon /> {k.amount}</span>
              <span>{new Date(k.createdAt).toLocaleDateString()}</span>
            </div>
            {k.message ? <p className={cn("mt-1.5 text-sm text-foreground/85", rtl && "font-arabic")}>{k.message}</p> : null}
          </div>
        ))}
        {history?.length === 0 ? <p className="text-sm text-muted-foreground">{t("read.noKudosYet")}</p> : null}
      </div>
    </div>
  );
}

function LockedWorkView({
  workId,
  title,
  creatorName,
  unlockMethod,
  kudosPrice,
  loggedIn,
  rtl,
}: {
  workId: string;
  title: string;
  creatorName: string;
  unlockMethod: "request" | "kudos";
  kudosPrice: number;
  loggedIn: boolean;
  rtl: boolean;
}) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const requestAccess = trpc.access.request.useMutation({
    onSuccess: () => setStatus("sent"),
    onError: (err) => { setStatus("error"); setError(err.message); },
  });
  const unlockWithKudos = trpc.access.unlockWithKudos.useMutation({
    onSuccess: () => utils.works.byId.invalidate({ id: workId }),
    onError: (err) => { setStatus("error"); setError(err.message); },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/read"><ArrowLeftIcon className="size-4 mr-1" /> {t("read.backToDiscover")}</Link>
        </Button>
      </div>
      <div className={cn("rounded-2xl border border-border bg-card p-8 text-center", rtl && "font-arabic")}>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{creatorName}</p>
        <p className="mt-4 text-sm font-semibold text-foreground">{t("read.confidentialTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("read.confidentialBody")}</p>

        <div className="mt-6">
          {!loggedIn ? (
            <p className="text-sm text-muted-foreground">{t("read.signInToUnlock")}</p>
          ) : unlockMethod === "kudos" ? (
            <Button
              onClick={() => { setStatus("idle"); setError(null); unlockWithKudos.mutate({ contentType: "work", contentId: workId }); }}
              disabled={unlockWithKudos.isPending}
            >
              {unlockWithKudos.isPending ? <Loader2Icon className="size-4 mr-1.5 animate-spin" /> : null}
              {t("read.unlockWithKudos", { count: kudosPrice })}
            </Button>
          ) : status === "sent" ? (
            <p className="text-sm font-medium text-foreground">{t("read.requestPending")}</p>
          ) : (
            <Button
              onClick={() => requestAccess.mutate({ contentType: "work", contentId: workId })}
              disabled={requestAccess.isPending}
            >
              {requestAccess.isPending ? <Loader2Icon className="size-4 mr-1.5 animate-spin" /> : null}
              {t("read.requestAccess")}
            </Button>
          )}
          {status === "error" && error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ReadPage({ params }: { params: Promise<{ workId: string }> }) {
  const { t } = useTranslation();
  const { workId } = use(params);
  const { lang } = useLang();
  const [targetLang, setTargetLang] = useState<Lang>(lang);
  const [generatedTranslation, setGeneratedTranslation] = useState<{
    lang: Lang;
    title: string;
    tag: string;
    summary: string;
    body: string;
  } | null>(null);
  const [kudosDone, setKudosDone] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [pendingKudosAmount, setPendingKudosAmount] = useState<number | null>(null);
  const rtl = lang === "ar";
  const { data: session } = useSession();

  useEffect(() => {
    setTargetLang(lang);
  }, [lang]);

  const { data: work } = trpc.works.byId.useQuery({ id: workId });
  const utils = trpc.useUtils();
  const sendKudos = trpc.works.sendKudos.useMutation({
    onSuccess: async () => {
      setKudosDone(true);
      setPendingKudosAmount(null);
      setReviewText("");
      await utils.works.getKudos.invalidate({ workId });
      await utils.users.me.invalidate();
    },
  });
  const translateWork = trpc.works.translate.useMutation({
    onSuccess: async (translation) => {
      setGeneratedTranslation({
        lang: translation.lang,
        title: translation.title ?? "",
        tag: translation.tag ?? "",
        summary: translation.summary ?? "",
        body: translation.body,
      });
      await utils.works.byId.invalidate({ id: workId });
    },
  });
  const { data: summaryData, isLoading: summaryLoading, refetch: fetchSummary } = trpc.works.summarize.useQuery(
    { workId, lang: targetLang },
    { enabled: showSummary }
  );

  const seed = SEED_WORKS.find(w => w.id === workId);
  const w = work ?? (seed ? { ...seed, title: seed.title as Record<string,string>, tag: seed.tag as Record<string,string>, kudosCount: 0, creator: { name: SEED_CREATOR.name, username: SEED_CREATOR.username } } : null);
  if (!w) return <div className="flex items-center justify-center pt-32 text-muted-foreground">{t("read.notFound")}</div>;

  if (work && work.locked) {
    const lockedTitles = work.title as Record<string, string>;
    return (
      <LockedWorkView
        workId={workId}
        title={lockedTitles[lang] || lockedTitles.en || lockedTitles.ar || "Untitled"}
        creatorName={work.creator.name}
        unlockMethod={work.unlockMethod}
        kudosPrice={work.kudosPrice}
        loggedIn={Boolean(session?.user)}
        rtl={rtl}
      />
    );
  }

  const titlesByLang = w.title as Record<string,string>;
  const tagsByLang = w.tag as Record<string,string>;
  const bodyByLang: Record<Lang, string> = {
    ar: work ? work.bodyAr : seed?.bodyAr ?? "",
    en: work ? work.bodyEn : seed?.bodyEn ?? "",
    fr: work ? work.bodyFr : (seed as { bodyFr?: string } | undefined)?.bodyFr ?? "",
    es: work ? work.bodyEs : (seed as { bodyEs?: string } | undefined)?.bodyEs ?? "",
  };
  const originalLang = LANG_ORDER.find((code) => bodyByLang[code]?.trim() || titlesByLang[code]?.trim()) ?? lang;
  const generatedForTarget = generatedTranslation?.lang === targetLang ? generatedTranslation : null;
  const translatedLangs = LANG_ORDER.filter((code) => {
    if (code === originalLang) return false;
    return Boolean(bodyByLang[code]?.trim()) || generatedTranslation?.lang === code;
  });
  const title  = titlesByLang[originalLang] || titlesByLang.en || titlesByLang.ar || "Untitled";
  const translatedTitle = targetLang !== originalLang ? generatedForTarget?.title || titlesByLang[targetLang] || "" : "";
  const tag    = tagsByLang[originalLang] || tagsByLang.en || "";
  const body   = bodyByLang[originalLang] || bodyByLang.en || "";
  const translatedBody = targetLang !== originalLang ? generatedForTarget?.body || bodyByLang[targetLang] || "" : "";
  const accent = (w as {accentColor?: string}).accentColor ?? "#6366f1";
  const workTags: string[] = (w as {tags?: string[]}).tags ?? (work ? JSON.parse((work as {tagsJson?: string}).tagsJson ?? "[]") : []);
  const canTranslate = targetLang !== originalLang && !translatedBody.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Back */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/read"><ArrowLeftIcon className="size-4 mr-1" /> {t("read.backToDiscover")}</Link>
        </Button>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className={cn("mb-4 flex flex-wrap items-center gap-2", rtl && "flex-row-reverse")}>
          <Badge variant="outline" style={{ color: accent, borderColor: `${accent}40` }} className="text-[0.6rem] font-semibold uppercase tracking-wider">
            {(w as {type?: string}).type}
          </Badge>
          <Badge variant="secondary" className="text-[0.6rem] font-semibold uppercase tracking-wider">
            Original: {LANG_LABEL[originalLang]}
          </Badge>
          {translatedLangs.length ? (
            <Badge className="text-[0.6rem] font-semibold uppercase tracking-wider">
              Translated into {translatedLangs.map((code) => LANG_LABEL[code]).join(", ")}
            </Badge>
          ) : null}
          {(w as {readingTime?: number}).readingTime && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              {t("read.minutesRead", { count: (w as {readingTime?: number}).readingTime })}
            </span>
          )}
          {workTags.map(t => (
            <Link key={t} href={`/read?tag=${t}`}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.6rem] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              <TagIcon className="size-2.5" />{t.replace(/-/g, " ")}
            </Link>
          ))}
        </div>
        <h1 className={cn("mb-1 text-2xl font-bold sm:text-3xl text-foreground", originalLang === "ar" ? "font-arabic text-right" : "font-display")} dir={originalLang === "ar" ? "rtl" : "ltr"}>{title}</h1>
        {translatedTitle ? (
          <div className={cn("mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3", lang === "ar" && "text-right")}>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
              {LANG_LABEL[targetLang]} translation available
            </p>
            <p className={cn("text-sm font-medium text-foreground", targetLang === "ar" && "font-arabic")} dir={targetLang === "ar" ? "rtl" : "ltr"}>{translatedTitle}</p>
          </div>
        ) : null}
        <p className={cn("mt-2 text-sm text-muted-foreground", originalLang === "ar" ? "font-arabic text-right" : "")}>{tag}</p>
        <Link href={`/${(w as {creator?: {username?: string | null}}).creator?.username ?? ""}`}
          className={cn("mt-4 inline-flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted transition-colors", rtl && "flex-row-reverse")}>
          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {(w as {creator?: {name: string}}).creator?.name?.charAt(0)}
          </div>
          <span className={cn("text-xs font-medium", rtl ? "font-arabic" : "font-mono")}>{(w as {creator?: {name: string}}).creator?.name}</span>
        </Link>

        <div className={cn("mt-5 rounded-xl border border-border bg-card p-3", rtl && "text-right")}>
          <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", rtl && "sm:flex-row-reverse")}>
            <div>
              <p className="text-sm font-semibold text-foreground">AI translation</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose a language and generate it if this article does not have that translation yet.
              </p>
            </div>
            <div className={cn("flex items-center gap-2", rtl && "flex-row-reverse")}>
              <select
                value={targetLang}
                onChange={(event) => setTargetLang(event.target.value as Lang)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                aria-label="Translate to language"
              >
                {LANG_ORDER.map((code) => (
                  <option key={code} value={code}>
                    {LANG_LABEL[code]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={() => translateWork.mutate({ workId, targetLang })}
                disabled={!canTranslate || translateWork.isPending}
              >
                {translateWork.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                {translatedBody.trim() ? "Ready" : targetLang === originalLang ? "Original" : "Translate"}
              </Button>
            </div>
          </div>
          {translateWork.error ? (
            <p className="mt-3 text-xs text-destructive">{translateWork.error.message}</p>
          ) : null}
        </div>

        {/* AI Summary toggle */}
        <div className="mt-4">
          <button onClick={() => setShowSummary(s => !s)}
            className={cn("flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", rtl && "flex-row-reverse ml-auto")}>
            <SparklesIcon className="size-3.5" />
            {showSummary ? t("read.hideSummary") : t("read.aiSummary")}
          </button>
          {showSummary && (
            <div className={cn("mt-3 rounded-xl border border-border bg-muted/40 p-4 text-sm", rtl && "text-right")}>
              {summaryLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground"><Loader2Icon className="size-3.5 animate-spin" />{t("read.generatingSummary")}</span>
              ) : summaryData?.summary ? (
                <p className={cn("text-foreground/80 leading-relaxed", rtl && "font-arabic")} dir={rtl ? "rtl" : "ltr"}>{summaryData.summary}</p>
              ) : null}
            </div>
          )}
        </div>

        <Separator className="mt-6" />
      </header>

      {/* Body */}
      <article className="mb-14">
        {body ? <BodyContent text={body} lang={originalLang} accent={accent} /> : (
          <div className="space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="h-4 animate-pulse rounded-full bg-muted" style={{ width:`${55+Math.random()*45}%` }} />)}</div>
        )}
        {translatedBody ? (
          <section className="mt-10 border-t border-border pt-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              {LANG_LABEL[targetLang]} translation
            </div>
            <BodyContent text={translatedBody} lang={targetLang} accent={accent} />
          </section>
        ) : null}
      </article>

      {/* Kudos */}
      <div className={cn("rounded-2xl border border-border bg-card p-6", rtl ? "text-right" : "text-left")}>
        <p className={cn("mb-1.5 font-semibold text-foreground", rtl ? "font-arabic" : "font-display")}>
          {t("read.enjoyed")}
        </p>
        <p className="mb-5 text-sm text-muted-foreground">
          {t("read.sendKudosHint")}
        </p>
        <textarea
          rows={3}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          maxLength={280}
          dir={rtl ? "rtl" : "ltr"}
          placeholder={t("read.reviewPlaceholder")}
          className={cn("mb-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm", rtl && "font-arabic text-right")}
        />
        {kudosDone ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            ✦ {t("read.thankYou")}
          </p>
        ) : (
          <div className={cn("flex items-center gap-2", rtl && "flex-row-reverse")}>
            {([1,2,3,5] as const).map(amt => (
              <button key={amt} onClick={() => setPendingKudosAmount(amt)} disabled={sendKudos.isPending || !session}
                className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted transition-colors disabled:opacity-40">
                <span className="flex items-center gap-0.5">{Array.from({ length: Math.min(amt, 3) }).map((_, index) => <KudosIcon key={index} />)}</span>
                <span className="text-[0.6rem] text-muted-foreground font-mono">{amt}</span>
              </button>
            ))}
          </div>
        )}
        {!session ? <p className="mt-3 text-xs text-muted-foreground">{t("read.signInToKudos")}</p> : null}
        {sendKudos.error ? <p className="mt-3 text-xs text-destructive">{sendKudos.error.message}</p> : null}
      </div>

      <Dialog open={pendingKudosAmount !== null} onOpenChange={(open) => !open && setPendingKudosAmount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {pendingKudosAmount ?? 0} kudos?</DialogTitle>
            <DialogDescription>
              This will spend {pendingKudosAmount ?? 0} token{pendingKudosAmount === 1 ? "" : "s"} from your balance and attach your note if you wrote one.
            </DialogDescription>
          </DialogHeader>
          {reviewText.trim() ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {reviewText.trim()}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingKudosAmount(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingKudosAmount) return;
                sendKudos.mutate({ workId, amount: pendingKudosAmount, message: reviewText.trim() || undefined });
              }}
              disabled={sendKudos.isPending}
            >
              {sendKudos.isPending ? "Sending..." : "Confirm Kudos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KudosHistory workId={workId} lang={lang} />
    </div>
  );
}

function KudosIcon() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full border border-current font-display text-[0.65rem] font-semibold italic leading-none">
      K
    </span>
  );
}
