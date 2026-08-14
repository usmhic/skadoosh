"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSession } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ClockIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import { SEED_CREATOR, SEED_WORKS } from "@skaddosh/db/seed-data";

const WORK_TYPES = [
  "story",
  "novel",
  "poem",
  "essay",
  "article",
  "journal",
  "script",
] as const;
const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "discussed", label: "Discussed" },
] as const;

const CATEGORIES = [
  "intellectual-property",
  "science",
  "technology",
  "philosophy",
  "literature",
  "history",
  "politics",
  "economics",
  "art",
  "culture",
  "society",
  "environment",
] as const;
const LANG_ORDER = ["ar", "en", "fr", "es"] as const;

type WorkType = (typeof WORK_TYPES)[number];
type Sort = (typeof SORTS)[number]["value"];

export function DiscoverySurface({
  basePath = "/read",
}: {
  basePath?: "/" | "/read";
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const activeSearch = searchParams.get("q") ?? "";
  const activeTag = searchParams.get("tag") ?? "";
  const activeType = searchParams.get("type") ?? "";
  const activeSort = (searchParams.get("sort") as Sort | null) ?? "popular";
  const hasFilters = Boolean(
    activeSearch || activeTag || activeType || activeSort !== "popular",
  );

  const { data: meData, isLoading: interestsLoading } = trpc.users.me.useQuery(
    undefined,
    { enabled: !!session },
  );
  const interests = useMemo(() => {
    try {
      return JSON.parse(
        meData?.settings?.contentCategories ?? "[]",
      ) as string[];
    } catch {
      return [];
    }
  }, [meData?.settings?.contentCategories]);
  const interestFilter =
    !activeSearch && !activeTag && !activeType ? interests : [];

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
  };

  const clearAll = () => {
    router.push(basePath);
  };

  const worksQuery = trpc.works.list.useQuery({
    limit: 30,
    search: activeSearch || undefined,
    tag: activeTag || undefined,
    interests: interestFilter,
    type: (activeType as WorkType) || undefined,
    sort: activeSort,
  });

  const seedWorks =
    activeSearch || activeTag || activeType
      ? []
      : SEED_WORKS.map((w) => ({
          ...w,
          title: w.title as Record<string, string>,
          tag: w.tag as Record<string, string>,
          tags: [] as string[],
          creator: { name: SEED_CREATOR.name, username: SEED_CREATOR.username },
          kudosCount: 0,
        }));
  const works = worksQuery.data ?? (worksQuery.isLoading ? [] : seedWorks);
  const rtl = lang === "ar";

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {interestFilter.length
              ? `Tuned to ${interestFilter
                  .slice(0, 3)
                  .map((item) => item.replace(/-/g, " "))
                  .join(", ")}`
              : t("read.discoverSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="icon" asChild aria-label="Create new content">
            <Link href="/studio/new">
              <PlusIcon className="size-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-label="Advanced Filter"
          >
            <SlidersHorizontalIcon className="size-4" />
          </Button>
        </div>
      </div>

      {advancedOpen ? (
        <div className="mb-5 animate-in rounded-2xl border border-border bg-card p-4 shadow-sm fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <FilterGroup label={t("read.typeLabel")}>
              {WORK_TYPES.map((type) => (
                <FilterPill
                  key={type}
                  active={activeType === type}
                  onClick={() =>
                    setParam("type", activeType === type ? "" : type)
                  }
                >
                  {type}
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label="Sort">
              {SORTS.map((sort) => (
                <FilterPill
                  key={sort.value}
                  active={activeSort === sort.value}
                  onClick={() =>
                    setParam("sort", sort.value === "popular" ? "" : sort.value)
                  }
                >
                  {sort.label}
                </FilterPill>
              ))}
            </FilterGroup>
            <div className="lg:col-span-2">
              <FilterGroup label="Topic">
                {CATEGORIES.map((category) => (
                  <FilterPill
                    key={category}
                    active={activeTag === category}
                    onClick={() =>
                      setParam("tag", activeTag === category ? "" : category)
                    }
                  >
                    {category.replace(/-/g, " ")}
                  </FilterPill>
                ))}
                {hasFilters ? (
                  <button
                    onClick={clearAll}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                    {t("read.clear")}
                  </button>
                ) : null}
              </FilterGroup>
            </div>
          </div>
        </div>
      ) : null}

      {!hasFilters && interestsLoading && session ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Loading your interests...
        </p>
      ) : null}

      {worksQuery.isLoading ? (
        <DiscoverySkeleton />
      ) : worksQuery.isError && works.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/30 bg-destructive/[0.03] px-6 py-16 text-center"
          role="alert"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <SearchIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              We couldn’t load these works
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Check your connection and try once more.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void worksQuery.refetch()}
          >
            <RefreshCwIcon className="size-3.5" /> Try again
          </Button>
        </div>
      ) : works.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="size-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium">
            {activeSearch
              ? t("read.noWorksFor", { query: activeSearch })
              : t("read.noWorksFound")}
          </p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            Try a broader search or remove a filter to discover more creative
            work.
          </p>
          {hasFilters ? (
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} lang={lang} rtl={rtl} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <TagIcon className="size-3.5" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full border px-3 py-1 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DiscoverySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-5 w-4/5 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-8 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function WorkCard({
  work,
  lang,
  rtl,
}: {
  work: {
    id: string;
    title: Record<string, string>;
    tag: Record<string, string>;
    type?: string;
    readingTime?: number | null;
    accentColor?: string;
    tags?: string[];
    kudosCount?: number;
    creator?: { name: string | null; username: string | null };
  };
  lang: string;
  rtl: boolean;
}) {
  const { t } = useTranslation();
  const originalLang =
    LANG_ORDER.find((code) => work.title[code]?.trim()) ?? "en";
  const originalTitle =
    work.title[originalLang] ?? work.title.en ?? work.title.ar ?? "Untitled";
  const translatedTitle = lang !== originalLang ? work.title[lang] : "";
  const tag = work.tag[originalLang] ?? work.tag.en ?? "";
  const accent = work.accentColor ?? "#6366f1";
  const tags = work.tags ?? [];

  return (
    <Link
      href={`/read/${work.id}`}
      className="group relative flex min-h-52 flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 outline-none transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 transition-all group-hover:h-1"
        style={{ background: accent }}
      />
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          rtl && "flex-row-reverse",
        )}
      >
        <Badge
          variant="outline"
          className="text-[0.58rem] font-semibold uppercase tracking-wider"
          style={{ color: accent, borderColor: `${accent}40` }}
        >
          {work.type ?? "story"}
        </Badge>
        {translatedTitle ? (
          <Badge className="text-[0.55rem] font-semibold uppercase tracking-wider">
            Translated
          </Badge>
        ) : null}
        {work.readingTime ? (
          <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
            <ClockIcon className="size-3" />
            {t("read.minutesShort", { count: work.readingTime })}
          </span>
        ) : null}
      </div>
      <div className={rtl ? "text-right" : "text-left"}>
        <h2
          className={cn(
            "text-base font-bold leading-snug text-foreground",
            originalLang === "ar" ? "font-arabic" : "font-display italic",
          )}
          dir={originalLang === "ar" ? "rtl" : "ltr"}
        >
          {originalTitle}
        </h2>
        {translatedTitle ? (
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              lang === "ar" && "font-arabic",
            )}
            dir={lang === "ar" ? "rtl" : "ltr"}
          >
            {translatedTitle}
          </p>
        ) : null}
      </div>
      <p
        className={cn(
          "text-xs text-muted-foreground",
          rtl ? "font-arabic text-right" : "",
        )}
      >
        {tag}
      </p>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full bg-muted px-2 py-0.5 text-[0.58rem] capitalize text-muted-foreground"
            >
              {item.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "mt-auto flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground",
          rtl && "flex-row-reverse",
        )}
      >
        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[0.6rem] font-bold">
          {work.creator?.name?.charAt(0) ?? "?"}
        </div>
        <span className={rtl ? "font-arabic" : "font-mono"}>
          {work.creator?.name}
        </span>
        {work.kudosCount ? (
          <span className="ml-auto flex items-center gap-0.5">
            {work.kudosCount} Cold
          </span>
        ) : null}
      </div>
    </Link>
  );
}
