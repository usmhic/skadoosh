"use client";
import { use, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { CreateItemDialog } from "@/components/studio/create-item-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@skaddosh/ui/components/ui/avatar";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@skaddosh/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@skaddosh/ui/components/ui/dropdown-menu";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  ClockIcon,
  FolderOpenIcon,
  GlobeIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LockIcon,
  LogOutIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";
import { SEED_CREATOR, SEED_WORKS } from "@skaddosh/db/seed-data";

type PublicTab = "all" | "articles" | "gallery" | "projects" | "portfolio";
type OwnerTab = "overview" | "publishing";
type ActiveTab = PublicTab | OwnerTab;

interface GalleryFolder {
  id: string;
  name: string;
  description: string;
  coverImage?: string | null;
  imageCount: number;
}
interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url?: string | null;
  coverImage?: string | null;
}
type ContentWork = {
  id: string;
  type?: string;
  accentColor?: string;
  readingTime?: number;
  kudosCount?: number;
  title: Record<string, string>;
  tag: Record<string, string>;
};

export default function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { data: session } = useSession();
  const { data, isLoading } = trpc.creators.byUsername.useQuery({ username });
  const { data: me } = trpc.users.me.useQuery(undefined, { enabled: !!session });
  const { data: worksData } = trpc.works.mine.useQuery(undefined, { enabled: !!session });
  const { data: portfolioData } = trpc.portfolios.mine.useQuery(undefined, { enabled: !!session });
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const fallbackCreator = username === SEED_CREATOR.username ? SEED_CREATOR : null;
  const creator = data?.creator ?? fallbackCreator;
  const publicWorks = data?.works ?? (username === SEED_CREATOR.username
    ? SEED_WORKS.map((w) => ({ ...w, title: w.title as Record<string, string>, tag: w.tag as Record<string, string> }))
    : []);
  const portfolio = data?.portfolio;

  if (isLoading) return <ProfileSkeleton />;

  if (!creator) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <GlobeIcon className="size-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const initials = creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const totalKudos = publicWorks.reduce((s, w) => s + ((w as ContentWork).kudosCount ?? 0), 0);
  const isOwner = me?.user.username === creator.username;

  const galleryFolders: GalleryFolder[] = portfolio?.gallery ?? [];
  const allProjects: Project[] = portfolio?.projects ?? [];

  const myWorks = worksData ?? [];
  const publishedCount = myWorks.filter((w) => w.published).length;
  const draftCount = myWorks.length - publishedCount;
  const myTotalKudos = myWorks.reduce((s, w) => s + w.kudosCount, 0);
  const myPortfolio = portfolioData?.exists ? portfolioData.portfolio : null;
  const unreadInbox = (myPortfolio?.inbox ?? []).filter((m) => !m.read).length;

  const isOwnerTab = activeTab === "overview" || activeTab === "publishing";

  const publicTabs: Array<{
    value: PublicTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    premium?: boolean;
  }> = [
    { value: "all", label: "All", icon: SparklesIcon, count: publicWorks.length + galleryFolders.length + allProjects.length },
    { value: "articles", label: "Articles", icon: BookOpenIcon, count: publicWorks.length },
    { value: "gallery", label: "Gallery", icon: ImageIcon, count: galleryFolders.length },
    { value: "projects", label: "Projects", icon: FolderOpenIcon, count: allProjects.length },
    { value: "portfolio", label: "Portfolio", icon: SparklesIcon, premium: !portfolio },
  ];

  const ownerTabs: Array<{
    value: OwnerTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "overview", label: "Overview", icon: LayoutDashboardIcon },
    { value: "publishing", label: "Publishing", icon: PencilIcon },
  ];

  // Combined "All" feed items
  type FeedItem =
    | { kind: "article"; data: ContentWork }
    | { kind: "gallery"; data: GalleryFolder }
    | { kind: "project"; data: Project };

  const allFeedItems: FeedItem[] = [
    ...(publicWorks as ContentWork[]).map((w) => ({ kind: "article" as const, data: w })),
    ...galleryFolders.map((f) => ({ kind: "gallery" as const, data: f })),
    ...allProjects.map((p) => ({ kind: "project" as const, data: p })),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

      {/* Profile header */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <Avatar className="size-20 rounded-2xl sm:size-24">
                {(creator as { image?: string | null }).image ? (
                  <AvatarImage
                    src={(creator as { image?: string | null }).image ?? undefined}
                    alt={creator.name}
                    className="rounded-2xl object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOwner ? (
                <Link
                  href="/settings"
                  className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-muted"
                  title="Edit profile"
                >
                  <PencilIcon className="size-3 text-muted-foreground" />
                </Link>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{creator.name}</h1>
                  {creator.username ? (
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground">@{creator.username}</p>
                  ) : null}
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="flex items-center gap-2">
                            <SettingsIcon className="size-3.5" /> Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                          onClick={() => signOut()}
                        >
                          <LogOutIcon className="size-3.5" /> Sign out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>

              {creator.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{creator.bio}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-foreground tabular-nums">{publicWorks.length}</span>
                  <span className="text-muted-foreground">reads</span>
                </span>
                <span className="h-3.5 w-px bg-border" />
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="inline-flex size-4 items-center justify-center rounded-full border border-muted-foreground font-display text-[0.6rem] font-semibold italic leading-none text-muted-foreground">
                    K
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{totalKudos}</span>
                  <span className="text-muted-foreground">Cold Kudos</span>
                </span>
                {"location" in creator && creator.location ? (
                  <>
                    <span className="h-3.5 w-px bg-border" />
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPinIcon className="size-3.5" />
                      {creator.location}
                    </span>
                  </>
                ) : null}
                {isOwner && unreadInbox > 0 ? (
                  <>
                    <span className="h-3.5 w-px bg-border" />
                    <Link
                      href="/inbox"
                      className="flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-semibold text-primary-foreground"
                    >
                      {unreadInbox} unread
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab bar */}
      <div className="mb-3 overflow-x-auto">
        <div className="flex min-w-fit items-center justify-between gap-2 rounded-xl border border-border bg-card p-1">
          <div className="flex gap-1">
            {publicTabs.map(({ value, label, icon: Icon, count, premium }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                  activeTab === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {premium && !portfolio ? (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide",
                      activeTab === value
                        ? "bg-white/20 text-white"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    Pro
                  </span>
                ) : count !== undefined && count > 0 ? (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[0.6rem] tabular-nums",
                      activeTab === value
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {isOwner ? (
            <Button size="sm" className="mr-1 shrink-0" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-3.5" />
              New
            </Button>
          ) : null}
        </div>
      </div>

      {/* Dashboard strip (owner only) */}
      {isOwner ? (
        <div className="mb-6 overflow-x-auto">
          <div
            className={cn(
              "flex min-w-fit items-center gap-1 rounded-xl border p-1",
              isOwnerTab ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-card",
            )}
          >
            <span className="px-2.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Dashboard
            </span>
            {ownerTabs.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                  activeTab === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── All tab — combined feed ── */}
      {activeTab === "all" ? (
        <section>
          {allFeedItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allFeedItems.map((item, idx) => {
                if (item.kind === "article") {
                  const w = item.data;
                  const accent = w.accentColor ?? "#6366f1";
                  return (
                    <ArticleCard
                      key={`article-${w.id}`}
                      work={w}
                      accent={accent}
                      isOwner={isOwner}
                    />
                  );
                }
                if (item.kind === "gallery") {
                  return <GalleryCard key={`gallery-${item.data.id}`} folder={item.data} />;
                }
                return <ProjectCard key={`project-${item.data.id}-${idx}`} project={item.data} />;
              })}
            </div>
          ) : (
            <EmptyTab
              icon={SparklesIcon}
              title="Nothing here yet"
              description={isOwner ? "Create your first piece — article, project, or gallery." : "No published content yet."}
            >
              {isOwner ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-3.5" /> Create something
                </Button>
              ) : null}
            </EmptyTab>
          )}
        </section>
      ) : null}

      {/* ── Articles tab ── */}
      {activeTab === "articles" ? (
        <section>
          {publicWorks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(publicWorks as ContentWork[]).map((w) => (
                <ArticleCard
                  key={w.id}
                  work={w}
                  accent={w.accentColor ?? "#6366f1"}
                  isOwner={isOwner}
                />
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={BookOpenIcon}
              title="No articles yet"
              description={isOwner ? "Create your first article." : "No published reads yet."}
            >
              {isOwner ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-3.5" /> New article
                </Button>
              ) : null}
            </EmptyTab>
          )}
        </section>
      ) : null}

      {/* ── Gallery tab ── */}
      {activeTab === "gallery" ? (
        <section>
          {galleryFolders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryFolders.map((folder) => (
                <GalleryCard key={folder.id} folder={folder} />
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={ImageIcon}
              title="No gallery yet"
              description={isOwner ? "Add gallery folders in Portfolio." : "No gallery added yet."}
            >
              {isOwner ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/portfolio/edit">Open Portfolio</Link>
                </Button>
              ) : null}
            </EmptyTab>
          )}
        </section>
      ) : null}

      {/* ── Projects tab ── */}
      {activeTab === "projects" ? (
        <section>
          {allProjects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {allProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={FolderOpenIcon}
              title="No projects yet"
              description={isOwner ? "Add projects in Portfolio." : "No projects added yet."}
            >
              {isOwner ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/portfolio/edit">Open Portfolio</Link>
                </Button>
              ) : null}
            </EmptyTab>
          )}
        </section>
      ) : null}

      {/* ── Portfolio tab ── */}
      {activeTab === "portfolio" ? (
        <section>
          {portfolio ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 px-6 py-3">
                <SparklesIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Portfolio — dedicated story space
                </span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {portfolio.profileType === "individual" ? "Personal Portfolio" : "Organization"}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{portfolio.displayName ?? creator.name}</h2>
                    {portfolio.prompt ? (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{portfolio.prompt}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:shrink-0 sm:items-end">
                    <Button asChild size="lg" className="gap-2 shadow-sm">
                      <a href={`/portfolio/${portfolio.username}`} target="_blank" rel="noopener noreferrer">
                        Visit Portfolio <ArrowUpRightIcon className="size-4" />
                      </a>
                    </Button>
                    {isOwner ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/portfolio/edit">Edit Portfolio</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyTab
              icon={SparklesIcon}
              title="Portfolio not set up"
              description={
                isOwner
                  ? "Create your dedicated portfolio space — showcase experience, projects, gallery, and more."
                  : "This creator hasn't set up their portfolio yet."
              }
              premium
            >
              {isOwner ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/portfolio/edit">Set up Portfolio</Link>
                </Button>
              ) : null}
            </EmptyTab>
          )}
        </section>
      ) : null}

      {/* ── Overview (owner only) ── */}
      {activeTab === "overview" && isOwner ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Works" value={myWorks.length} />
            <StatCard label="Published" value={publishedCount} />
            <StatCard label="Drafts" value={draftCount} />
            <StatCard label="Cold Kudos" value={myTotalKudos} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Publishing rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {myWorks.length ? Math.round((publishedCount / myWorks.length) * 100) : 0}%
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">published</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${myWorks.length ? (publishedCount / myWorks.length) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Kudos per work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {publishedCount > 0 ? (myTotalKudos / publishedCount).toFixed(1) : "—"}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">avg</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {myTotalKudos > 0
                    ? `${myTotalKudos} total across ${publishedCount} published.`
                    : "No Kudos yet."}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick actions</CardTitle>
              <CardDescription>Jump to any part of your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <QuickAction href="/studio" icon={PencilIcon} title="Open Studio" description="Write and publish articles." />
              <QuickAction href="/portfolio/edit" icon={SparklesIcon} title="Portfolio Builder" description="Manage your dedicated portfolio site." />
              <QuickAction href="/settings" icon={SettingsIcon} title="Settings" description="Name, username, bio, and preferences." />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* ── Publishing (owner only) ── */}
      {activeTab === "publishing" && isOwner ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Your Works</h2>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-3.5" /> New
            </Button>
          </div>
          {myWorks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {myWorks.slice(0, 12).map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-border bg-card p-4 transition hover:border-border/80 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={w.published ? "default" : "outline"} className="text-[0.6rem]">
                      {w.published ? "Published" : "Draft"}
                    </Badge>
                    <span className="text-[0.6rem] capitalize text-muted-foreground">{w.type}</span>
                  </div>
                  <p className="mt-3 truncate text-sm font-medium">
                    {(w.title as Record<string, string>).en || (w.title as Record<string, string>).ar || "Untitled"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{w.kudosCount} Cold Kudos</p>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                      <Link href={`/studio/works/${w.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTab icon={BookOpenIcon} title="No works yet" description="Create your first article.">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-3.5" /> Create
              </Button>
            </EmptyTab>
          )}
        </section>
      ) : null}

      <CreateItemDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ── Shared card components ──────────────────────────────────────────────────

function ArticleCard({
  work,
  accent,
  isOwner,
}: {
  work: ContentWork;
  accent: string;
  isOwner: boolean;
}) {
  return (
    <div className="group relative flex min-h-52 flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      {isOwner ? (
        <Link
          href={`/studio/works/${work.id}`}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg border border-border bg-background opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-muted"
          title="Edit"
        >
          <PencilIcon className="size-3 text-muted-foreground" />
        </Link>
      ) : null}
      <Link href={`/read/${work.id}`} className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            style={{
              color: accent,
              borderColor: `${accent}30`,
              backgroundColor: `${accent}08`,
            }}
            className="text-[0.58rem] font-semibold uppercase tracking-wider"
          >
            {work.type}
          </Badge>
          {work.readingTime ? (
            <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <ClockIcon className="size-3" />
              {work.readingTime} min
            </span>
          ) : null}
        </div>
        <div className="flex-1">
          <h2 className="font-arabic text-base font-bold leading-snug text-foreground" dir="rtl">
            {work.title.ar}
          </h2>
          <p className="font-display text-sm italic text-muted-foreground">{work.title.en}</p>
        </div>
        <p className="text-xs text-muted-foreground">{work.tag.en}</p>
      </Link>
    </div>
  );
}

function GalleryCard({ folder }: { folder: GalleryFolder }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      {folder.coverImage ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={folder.coverImage}
            alt={folder.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <ImageIcon className="size-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <Badge variant="outline" className="text-[0.55rem] uppercase tracking-wide">Gallery</Badge>
        </div>
        <p className="text-sm font-semibold">{folder.name}</p>
        {folder.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{folder.description}</p>
        ) : null}
        <p className="mt-2 text-[0.65rem] text-muted-foreground/60">
          {folder.imageCount} {folder.imageCount === 1 ? "image" : "images"}
        </p>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[0.55rem] uppercase tracking-wide">Project</Badge>
          </div>
          <p className="font-medium">{project.title}</p>
        </div>
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Visit project"
          >
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        ) : null}
      </div>
      {project.description ? (
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{project.description}</p>
      ) : null}
      {project.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {project.tags.length > 6 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground">
              +{project.tags.length - 6}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Utility components ──────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-background p-4 transition hover:bg-muted/40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
        <ArrowUpRightIcon className="ml-auto size-4 text-muted-foreground transition group-hover:text-foreground" />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}

function EmptyTab({
  icon: Icon,
  title,
  description,
  children,
  premium,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
  premium?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
      <div className={cn("flex size-12 items-center justify-center rounded-2xl", premium ? "bg-amber-500/10" : "bg-muted")}>
        <Icon
          className={cn(
            "size-5",
            premium ? "text-amber-600/60 dark:text-amber-400/60" : "text-muted-foreground/50",
          )}
        />
        {premium ? <LockIcon className="absolute size-3.5 text-muted-foreground" /> : null}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-1 animate-pulse bg-muted" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <div className="size-20 animate-pulse rounded-2xl bg-muted sm:size-24" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-8 w-56 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 h-12 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
