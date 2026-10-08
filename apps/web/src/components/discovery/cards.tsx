"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@skaddosh/ui/components/ui/avatar";
import { cn } from "@skaddosh/ui/lib/utils";
import { ClockIcon, LockIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import {
  BackingProgress,
  KudosAmount,
  StageBadge,
  initials,
  timeAgo,
  type ProjectStage,
} from "@/components/kudos/kudos-ui";

const LANG_ORDER = ["ar", "en", "fr", "es"] as const;

type Creator = { name: string; username: string | null; image?: string | null };

export type WorkCardData = {
  kind: "work";
  id: string;
  type: string;
  title: Record<string, string>;
  tag: Record<string, string>;
  accentColor: string;
  readingTime: number | null;
  kudosCount: number;
  confidential?: boolean;
  creator: Creator;
  momentum?: number;
  activity?: { label: string; body?: string; at: Date | string };
};

export type ProjectCardData = {
  kind: "project";
  id: string;
  title: string;
  pitch: string;
  coverImage: string | null;
  accentColor: string;
  stage: ProjectStage;
  backingGoal: number;
  coldKudosTotal: number;
  backersCount: number;
  kudosReceived: number;
  openRoles: number;
  confidential?: boolean;
  creator: Creator;
  momentum?: number;
  activity?: { label: string; body?: string; at: Date | string };
  backerNumber?: number;
  earlyBeliever?: boolean;
};

export function DiscoverCard({ item, lang = "en" }: { item: WorkCardData | ProjectCardData; lang?: string }) {
  return item.kind === "project" ? <ProjectCard project={item} /> : <WorkCard work={item} lang={lang} />;
}

function CreatorLine({ creator, className }: { creator: Creator; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <Avatar className="size-6">
        {creator.image ? <AvatarImage src={creator.image} alt="" className="object-cover" /> : null}
        <AvatarFallback className="text-[0.55rem] font-semibold">{initials(creator.name)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-medium text-foreground/80">{creator.name}</span>
    </span>
  );
}

function ActivityLine({ activity }: { activity?: { label: string; body?: string; at: Date | string } }) {
  if (!activity) return null;
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {activity.label} · {timeAgo(activity.at)}
      </p>
      {activity.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/80">{activity.body}</p> : null}
    </div>
  );
}

function Momentum({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-hot" title="Distinct supporters in the last 14 days">
      <TrendingUpIcon className="size-3" />
      {value} new supporter{value === 1 ? "" : "s"}
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const seeking = (project.stage === "idea" || project.stage === "making") && project.backingGoal > 0;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card outline-none transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-xl hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          background: project.coverImage
            ? undefined
            : `radial-gradient(120% 90% at 0% 0%, ${project.accentColor}55, transparent 60%), radial-gradient(90% 80% at 100% 100%, ${project.accentColor}33, transparent 60%), ${project.accentColor}14`,
        }}
      >
        {project.coverImage ? (
          <img src={project.coverImage} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span
            aria-hidden="true"
            className="absolute -bottom-6 right-3 font-display text-[7rem] font-semibold italic leading-none opacity-15"
            style={{ color: project.accentColor }}
          >
            {project.title.charAt(0)}
          </span>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <StageBadge stage={project.stage} className="bg-background/90 backdrop-blur" />
          {project.confidential ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-medium backdrop-blur">
              <LockIcon className="size-3" /> Locked
            </span>
          ) : null}
        </div>
        {project.earlyBeliever || project.backerNumber ? (
          <span className="absolute right-3 top-3 rounded-full bg-cold px-2 py-0.5 text-[0.65rem] font-semibold text-cold-foreground">
            Backer #{project.backerNumber}
            {project.earlyBeliever ? " · early" : ""}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">{project.title || "Untitled project"}</h3>
          {project.pitch ? <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.pitch}</p> : null}
        </div>
        <ActivityLine activity={project.activity} />
        {seeking ? <BackingProgress cold={project.coldKudosTotal} goal={project.backingGoal} compact /> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
          <CreatorLine creator={project.creator} className="mr-auto" />
          {project.openRoles > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.68rem] text-muted-foreground">
              <UsersIcon className="size-3" /> {project.openRoles} open role{project.openRoles === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
          <KudosAmount temp="hot" value={project.kudosReceived} label="Kudos" size="xs" />
          <KudosAmount temp="cold" value={project.coldKudosTotal} label={`· ${project.backersCount} backer${project.backersCount === 1 ? "" : "s"}`} size="xs" />
          <span className="ml-auto">
            <Momentum value={project.momentum} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function WorkCard({ work, lang = "en" }: { work: WorkCardData; lang?: string }) {
  const originalLang = LANG_ORDER.find((code) => work.title[code]?.trim()) ?? "en";
  const title = work.title[originalLang] || "Untitled";
  const translated = lang !== originalLang ? work.title[lang] : "";
  const tag = work.tag[originalLang] ?? work.tag.en ?? "";
  const rtl = originalLang === "ar";

  return (
    <Link
      href={`/read/${work.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card p-5 outline-none transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-xl hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5" style={{ background: work.accentColor }} />
      <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        <span style={{ color: work.accentColor }}>{work.type}</span>
        {work.readingTime ? (
          <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal">
            <ClockIcon className="size-3" /> {work.readingTime} min
          </span>
        ) : null}
        {work.confidential ? <LockIcon className="ml-auto size-3" /> : null}
      </div>
      <div dir={rtl ? "rtl" : "ltr"} className={rtl ? "text-right" : ""}>
        <h3 className={cn("text-lg font-semibold leading-snug", rtl ? "font-arabic" : "font-display")}>{title}</h3>
        {translated ? <p className="mt-1 text-sm text-muted-foreground">{translated}</p> : null}
        {tag ? <p className={cn("mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground", rtl && "font-arabic")}>{tag}</p> : null}
      </div>
      <ActivityLine activity={work.activity} />
      <div className="mt-auto flex items-center gap-3 border-t border-border pt-3 text-xs">
        <CreatorLine creator={work.creator} className="mr-auto" />
        <Momentum value={work.momentum} />
        <KudosAmount temp="hot" value={work.kudosCount} size="xs" />
      </div>
    </Link>
  );
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="aspect-[16/9] animate-pulse bg-muted" />
          <div className="space-y-2 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </CardGrid>
  );
}
