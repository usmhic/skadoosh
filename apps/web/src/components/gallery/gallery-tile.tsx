"use client";

import Link from "next/link";
import { cn } from "@skaddosh/ui/lib/utils";
import { LockIcon, UsersIcon } from "lucide-react";
import { GenerativeCover, coverRatio } from "@/components/gallery/generative-cover";
import { KudosMark, StageBadge, VerifiedBadge, timeAgo, type ProjectStage } from "@/components/kudos/kudos-ui";
import { mediumLabel } from "@/lib/mediums";

const LANG_ORDER = ["ar", "en", "fr", "es"] as const;

type Creator = { name: string; username: string | null; image?: string | null; verified?: boolean };
type Activity = { label: string; body?: string; at: Date | string };

export type GalleryProject = {
  kind: "project";
  id: string;
  title: string;
  pitch: string;
  coverImage: string | null;
  accentColor: string;
  medium?: string;
  stage: ProjectStage;
  backingGoal: number;
  coldKudosTotal: number;
  backersCount: number;
  kudosReceived: number;
  openRoles: number;
  confidential?: boolean;
  creator: Creator;
  momentum?: number;
  activity?: Activity;
  backerNumber?: number;
  earlyBeliever?: boolean;
  role?: string;
};

export type GalleryWork = {
  kind: "work";
  id: string;
  type: string;
  title: Record<string, string>;
  tag: Record<string, string>;
  image?: string | null;
  accentColor: string;
  readingTime: number | null;
  kudosCount: number;
  confidential?: boolean;
  creator: Creator;
  momentum?: number;
  activity?: Activity;
};

export type GalleryItem = GalleryProject | GalleryWork;

/** Masonry gallery. Tiles keep their own aspect ratio, so the grid reads like a wall of work. */
export function Gallery({ items, lang = "en" }: { items: GalleryItem[]; lang?: string }) {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 2xl:columns-4">
      {items.map((item) => (
        <GalleryTile key={`${item.kind}-${item.id}`} item={item} lang={lang} />
      ))}
    </div>
  );
}

export function GalleryTile({ item, lang = "en" }: { item: GalleryItem; lang?: string }) {
  const isProject = item.kind === "project";
  const title = isProject ? item.title || "Untitled project" : workTitle(item.title);
  const subtitle = isProject ? item.pitch : item.tag[originalLang(item.title)] || item.tag.en || "";
  const translated = !isProject && lang !== originalLang(item.title) ? item.title[lang] : "";
  const href = isProject ? `/projects/${item.id}` : `/read/${item.id}`;
  const medium = isProject ? item.medium ?? "other" : "writing";
  const image = isProject ? item.coverImage : item.image;
  const ratio = coverRatio(item.id);
  const seeking = isProject && (item.stage === "idea" || item.stage === "making") && item.backingGoal > 0;
  const rtl = !isProject && originalLang(item.title) === "ar";

  return (
    <Link href={href} className="group mb-8 block break-inside-avoid outline-none" aria-label={title}>
      <div
        className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-black/10 group-focus-visible:ring-2 group-focus-visible:ring-ring"
        style={{ aspectRatio: String(ratio) }}
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
          {image ? (
            <img src={image} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <GenerativeCover id={item.id} accent={item.accentColor} medium={medium} title={title} />
          )}
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {isProject && item.stage !== "released" && item.stage !== "sustaining" ? (
            <StageBadge stage={item.stage} className="bg-background/90 backdrop-blur" />
          ) : null}
          {item.confidential ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-medium backdrop-blur">
              <LockIcon className="size-3" /> Supporters
            </span>
          ) : null}
        </div>
        {isProject && item.backerNumber ? (
          <span className="absolute right-3 top-3 rounded-full bg-cold px-2 py-0.5 text-[0.65rem] font-semibold text-cold-foreground">
            Backer #{item.backerNumber}
            {item.earlyBeliever ? " · early" : ""}
          </span>
        ) : null}
        {isProject && item.role ? (
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur">
            {item.role}
          </span>
        ) : null}
        {seeking ? (
          <div className="absolute inset-x-3 bottom-3 rounded-full bg-background/85 p-1 backdrop-blur">
            <div className="h-1.5 overflow-hidden rounded-full bg-cold-soft">
              <div
                className="h-full rounded-full bg-cold"
                style={{ width: `${Math.min(100, Math.round((item.coldKudosTotal / Math.max(1, item.backingGoal)) * 100))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-3 px-0.5">
        <div className="min-w-0 flex-1" dir={rtl ? "rtl" : undefined}>
          <h3 className={cn("text-[1.35rem] leading-tight tracking-tight", rtl ? "font-arabic font-semibold" : "font-display")}>
            {title}
          </h3>
          {translated ? <p className="mt-0.5 text-sm text-muted-foreground">{translated}</p> : null}
          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground" dir="ltr">
            <span className="truncate font-medium text-foreground/80">{item.creator.name}</span>
            <VerifiedBadge verified={item.creator.verified} />
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{mediumLabel(medium)}</span>
          </p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground" title="Kudos received">
          <KudosMark size="xs" />
          {isProject ? item.kudosReceived : item.kudosCount}
        </span>
      </div>

      {item.activity ? (
        <p className="mt-2 line-clamp-2 px-0.5 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{item.activity.label}</span> · {timeAgo(item.activity.at)}
          {item.activity.body ? ` — ${item.activity.body}` : ""}
        </p>
      ) : subtitle ? (
        <p className={cn("mt-1.5 line-clamp-2 px-0.5 text-sm leading-6 text-muted-foreground", rtl && "font-arabic text-right")}>
          {subtitle}
        </p>
      ) : null}

      {isProject && (item.openRoles > 0 || item.momentum) ? (
        <p className="mt-2 flex flex-wrap gap-3 px-0.5 text-[0.7rem] text-muted-foreground">
          {item.openRoles > 0 ? (
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="size-3" /> Looking for {item.openRoles} collaborator{item.openRoles === 1 ? "" : "s"}
            </span>
          ) : null}
          {item.momentum ? <span className="text-hot">↗ {item.momentum} new supporters</span> : null}
        </p>
      ) : null}
    </Link>
  );
}

export function GallerySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 2xl:columns-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-8 break-inside-avoid">
          <div className="animate-pulse rounded-2xl bg-muted" style={{ aspectRatio: String([0.8, 1, 0.75, 1.25][i % 4]) }} />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function originalLang(title: Record<string, string>) {
  return LANG_ORDER.find((code) => title[code]?.trim()) ?? "en";
}

function workTitle(title: Record<string, string>) {
  return title[originalLang(title)] || "Untitled";
}
