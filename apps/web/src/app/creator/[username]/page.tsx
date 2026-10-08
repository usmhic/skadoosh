"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Avatar, AvatarFallback, AvatarImage } from "@skaddosh/ui/components/ui/avatar";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import { ArrowUpRightIcon, GlobeIcon, ImageIcon, LinkIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { Gallery, GallerySkeleton, type GalleryItem } from "@/components/gallery/gallery-tile";
import { ReputationSignals, VerifiedBadge, initials } from "@/components/kudos/kudos-ui";
import { CreateItemDialog } from "@/components/studio/create-item-dialog";

type Tab = "work" | "contributes" | "believes" | "collections";

export default function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { data: session } = useSession();
  const { data, isLoading, refetch } = trpc.creators.byUsername.useQuery({ username });
  const [tab, setTab] = useState<Tab>("work");
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <ProfileSkeleton />;
  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <GlobeIcon className="size-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const { creator, portfolio } = data;
  const isOwner = data.viewer.isSelf;
  const creatorRef = { name: creator.name, username: creator.username, image: creator.image, verified: data.verified };

  const work: GalleryItem[] = [
    ...data.projects,
    ...data.works.map((w) => ({
      kind: "work" as const,
      id: w.id,
      type: w.type,
      title: w.title,
      tag: w.tag,
      image: w.image,
      accentColor: w.accentColor,
      readingTime: w.readingTime,
      kudosCount: w.kudosCount,
      confidential: w.visibility === "confidential",
      creator: creatorRef,
    })),
  ];
  const collections = portfolio?.gallery ?? [];

  const tabs: Array<{ value: Tab; label: string; count: number }> = [
    { value: "work", label: "Work", count: work.length },
    { value: "contributes", label: "Contributes to", count: data.contributesTo.length },
    { value: "believes", label: "Believes in", count: data.believesIn.length },
    { value: "collections", label: "Collections", count: collections.length },
  ];
  const visibleTabs = tabs.filter((t) => t.value === "work" || t.count > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-5">
          <Avatar className="size-20 sm:size-24">
            {creator.image ? <AvatarImage src={creator.image} alt="" className="object-cover" /> : null}
            <AvatarFallback className="text-2xl font-semibold">{initials(creator.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">
              {creator.name}
              <VerifiedBadge verified={data.verified} className="size-5" />
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {creator.username ? <span>@{creator.username}</span> : null}
              {creator.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-3.5" /> {creator.location}
                </span>
              ) : null}
              {creator.website ? (
                <a href={creator.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <LinkIcon className="size-3.5" /> {creator.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : null}
              <span>
                <span className="font-semibold tabular-nums text-foreground">{data.followers}</span> following their work
              </span>
            </p>
            {creator.bio ? <p className="mt-4 max-w-2xl font-serif text-lg leading-8">{creator.bio}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {portfolio ? (
            <Button asChild variant="outline" className="rounded-full">
              <a href={`/portfolio/${portfolio.username}`} target="_blank" rel="noopener noreferrer">
                Portfolio <ArrowUpRightIcon className="size-4" />
              </a>
            </Button>
          ) : null}
          {isOwner ? (
            <>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/settings">Edit profile</Link>
              </Button>
              <Button className="rounded-full" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" /> New
              </Button>
            </>
          ) : (
            <FollowButton
              creatorId={creator.id}
              following={data.viewer.following}
              signedIn={Boolean(session)}
              onChanged={() => void refetch()}
            />
          )}
        </div>
      </header>

      <ReputationSignals reputation={data.reputation} className="mt-8" />

      <nav aria-label="Profile sections" className="sticky top-16 z-20 -mx-4 mt-10 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-fit gap-1.5">
          {visibleTabs.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
                tab === value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
              <span className={cn("tabular-nums", tab === value ? "text-background/70" : "text-muted-foreground/70")}>{count}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        {tab === "work" ? (
          work.length ? (
            <Gallery items={work} />
          ) : (
            <Empty text={isOwner ? "Nothing published yet. Start with a project or a piece of writing." : "Nothing published yet."}>
              {isOwner ? (
                <Button className="rounded-full" onClick={() => setCreateOpen(true)}>
                  <PlusIcon className="size-4" /> Create something
                </Button>
              ) : null}
            </Empty>
          )
        ) : null}
        {tab === "contributes" ? <Gallery items={data.contributesTo} /> : null}
        {tab === "believes" ? <Gallery items={data.believesIn} /> : null}
        {tab === "collections" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((folder) => (
              <a key={folder.id} href={portfolio ? `/portfolio/${portfolio.username}` : "#"} className="group block">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60">
                  {folder.coverImage ? (
                    <img src={folder.coverImage} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ImageIcon className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-display text-2xl">{folder.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {folder.imageCount} {folder.imageCount === 1 ? "image" : "images"}
                </p>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <CreateItemDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start gap-5">
        <div className="size-24 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-10 w-72 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-12">
        <GallerySkeleton count={6} />
      </div>
    </div>
  );
}
