"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@skaddosh/ui/components/ui/dropdown-menu";
import { cn } from "@skaddosh/ui/lib/utils";
import { ArrowRightIcon, ChevronDownIcon, SparklesIcon } from "lucide-react";
import { Gallery, GallerySkeleton } from "@/components/gallery/gallery-tile";
import { MEDIUM_INFO } from "@/lib/mediums";
import type { Medium } from "@skaddosh/db/schema";

type Mode = "for-you" | "following" | "rising" | "backing" | "collab" | "new-voices";

const MODES: Array<{ value: Mode; label: string; blurb: string; auth?: boolean }> = [
  { value: "for-you", label: "For you", blurb: "Fresh original work, tuned to what you like." },
  { value: "following", label: "Following", blurb: "New work and updates from people you follow and projects you back.", auth: true },
  { value: "rising", label: "Rising", blurb: "Picking up support from different people right now." },
  { value: "backing", label: "Seeking backers", blurb: "Projects in progress. Back them early and your support counts for more." },
  { value: "collab", label: "Open to collaborators", blurb: "Projects looking for someone with your skills." },
  { value: "new-voices", label: "New voices", blurb: "People just starting out. Be one of their first supporters." },
];

export function Explore() {
  const { lang } = useLang();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requestedMode = (params.get("mode") as Mode | null) ?? "for-you";
  const mode = MODES.some((m) => m.value === requestedMode) ? requestedMode : "for-you";
  const requestedMedium = params.get("medium") as Medium | null;
  const medium = requestedMedium && requestedMedium in MEDIUM_INFO ? requestedMedium : undefined;

  const feed = trpc.discover.feed.useQuery({ mode, medium, limit: 48 });
  const mediums = trpc.discover.mediums.useQuery();
  const activeMode = MODES.find((m) => m.value === mode)!;

  const setParam = (key: "mode" | "medium", value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const counts = new Map((mediums.data ?? []).map((m) => [m.medium, m.count]));
  const visibleMediums = (Object.keys(MEDIUM_INFO) as Medium[]).filter((m) => m !== "other" && (counts.get(m) ?? 0) > 0);

  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 pb-20 sm:px-6 lg:px-10">
      {!session ? <Hero /> : null}

      <div className={cn("sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10", session ? "mt-0" : "")}>
        <div className="flex items-center gap-3 py-3">
          <nav aria-label="Filter by medium" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            <MediumChip active={!medium} onClick={() => setParam("medium", null)}>
              All
            </MediumChip>
            {visibleMediums.map((m) => {
              const Icon = MEDIUM_INFO[m].icon;
              return (
                <MediumChip key={m} active={medium === m} onClick={() => setParam("medium", medium === m ? null : m)}>
                  <Icon className="size-3.5" />
                  {MEDIUM_INFO[m].label}
                </MediumChip>
              );
            })}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-full">
                {activeMode.label}
                <ChevronDownIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setParam("mode", v === "for-you" ? null : v)}>
                {MODES.filter((m) => !m.auth || session).map((m) => (
                  <DropdownMenuRadioItem key={m.value} value={m.value}>
                    {m.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">{activeMode.blurb}</p>

      <div className="mt-6">
        {feed.isLoading ? (
          <GallerySkeleton />
        ) : feed.isError ? (
          <Empty title="We couldn't load the gallery" body="Check your connection and try again.">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void feed.refetch()}>
              Try again
            </Button>
          </Empty>
        ) : (feed.data?.items.length ?? 0) === 0 ? (
          <Empty
            title={mode === "following" ? "Nothing from your people yet" : "Nothing here yet"}
            body={
              mode === "following"
                ? "Follow creators or back a project, and their new work and updates will appear here."
                : "Be the first to share something in this corner of the gallery."
            }
          >
            <Button asChild size="sm" className="rounded-full">
              <Link href={session ? "/studio/new" : "/auth/signup"}>Share your work</Link>
            </Button>
          </Empty>
        ) : (
          <Gallery items={feed.data!.items} lang={lang} />
        )}
      </div>
    </div>
  );
}

function MediumChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Hero() {
  return (
    <section className="py-14 sm:py-20">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
        <SparklesIcon className="size-3.5 text-hot" /> A gallery of original, human-made work
      </p>
      <h1 className="mt-6 max-w-5xl text-balance font-display text-6xl leading-[0.95] tracking-tight sm:text-8xl">
        Original work, <em className="text-hot">made by people.</em>
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
        Discover art, software, music, writing, and ideas from verified creators. Appreciate them with Kudos,
        back them early, license their work, or join in.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-12 rounded-full px-6">
          <Link href="/auth/signup">
            Start your gallery <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
          <Link href="/how-it-works">How it works</Link>
        </Button>
      </div>
    </section>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
      <p className="font-display text-3xl">{title}</p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
