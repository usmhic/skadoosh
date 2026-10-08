"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth";
import { useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowRightIcon,
  CompassIcon,
  HandshakeIcon,
  HeartHandshakeIcon,
  PenLineIcon,
  RssIcon,
  SproutIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import { CardGrid, CardGridSkeleton, DiscoverCard } from "@/components/discovery/cards";
import { CircleIcon } from "@/components/discovery/circle-icon";
import { KudosMark } from "@/components/kudos/kudos-ui";

type Mode = "for-you" | "following" | "rising" | "backing" | "collab" | "new-voices";

const MODES: Array<{ value: Mode; label: string; icon: LucideIcon; blurb: string; auth?: boolean }> = [
  { value: "for-you", label: "For you", icon: CompassIcon, blurb: "Fresh pieces and projects, tuned to your interests." },
  { value: "following", label: "Following", icon: RssIcon, blurb: "Updates from creators you follow and projects you back.", auth: true },
  { value: "rising", label: "Rising", icon: TrendingUpIcon, blurb: "Picking up support from different people right now. Smaller creators get a lift." },
  { value: "backing", label: "Seeking backers", icon: HeartHandshakeIcon, blurb: "Projects in Idea or Making. Back early and your Kudos count for more." },
  { value: "collab", label: "Open collabs", icon: HandshakeIcon, blurb: "Projects looking for a collaborator. Raise your hand." },
  { value: "new-voices", label: "New voices", icon: SproutIcon, blurb: "Creators who are just starting out. Be one of their first supporters." },
];

export function DiscoverHome({ circle }: { circle?: string }) {
  const { lang } = useLang();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = (searchParams.get("mode") as Mode | null) ?? "for-you";
  const mode = MODES.some((m) => m.value === requested) ? requested : "for-you";
  const activeMode = MODES.find((m) => m.value === mode)!;

  const feed = trpc.discover.feed.useQuery({ mode, circle });
  const circles = trpc.discover.circles.useQuery(undefined, { enabled: !circle });

  const setMode = (next: Mode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "for-you") params.delete("mode");
    else params.set("mode", next);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const items = feed.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      {!session && !circle ? <Hero /> : null}

      <div className={cn("flex flex-col gap-4", session || circle ? "pt-8" : "pt-2")}>
        {!circle ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Discover</h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeMode.blurb}</p>
            </div>
            {session ? (
              <Button asChild size="sm" className="rounded-full">
                <Link href="/studio/new">
                  <PenLineIcon className="size-3.5" /> Share something
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{activeMode.blurb}</p>
        )}

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Discover modes" className="flex min-w-max gap-1.5">
            {MODES.filter((m) => !m.auth || session).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  mode === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {!circle && circles.data ? (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Circles</span>
              {circles.data.map((c) => (
                <Link
                  key={c.slug}
                  href={`/circles/${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <CircleIcon icon={c.icon} className="size-3.5" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {feed.isLoading ? (
          <CardGridSkeleton />
        ) : feed.isError ? (
          <EmptyState title="We couldn't load Discover" body="Check your connection and try again.">
            <Button variant="outline" size="sm" onClick={() => void feed.refetch()}>
              Try again
            </Button>
          </EmptyState>
        ) : items.length === 0 ? (
          <ModeEmpty mode={mode} />
        ) : (
          <CardGrid>
            {items.map((item) => (
              <DiscoverCard key={`${item.kind}-${item.id}`} item={item} lang={lang} />
            ))}
          </CardGrid>
        )}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hot">Original work · first believers</p>
        <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Make something. Find the people who believe in it <em className="text-hot">early</em>.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          skaddosh is a home for original, human-made creative work. Share what you make, get backed while
          it&apos;s still an idea, and pay your earliest supporters back when it works.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/auth/signup">
              Start creating <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/kudos#how">How Kudos work</Link>
          </Button>
        </div>
      </div>
      <KudosFlow />
    </section>
  );
}

/** A small diagram of the Kudos loop, shown in the hero and on the wallet page. */
export function KudosFlow() {
  const steps = [
    { temp: "hot" as const, title: "Give Hot Kudos", body: "Support any piece or project. Kudos go straight to its creator." },
    { temp: "cold" as const, title: "Back with Cold Kudos", body: "Commit Kudos to a project in progress. The earlier you back, the more your backing counts." },
    { temp: "cold" as const, title: "Released as it ships", body: "The creator receives your Kudos milestone by milestone. If the project is cancelled, they come back to you." },
    { temp: "hot" as const, title: "Returns for believers", body: "Successful projects share what they earn with their backers, up to a cap." },
  ];
  return (
    <ol className="relative grid gap-3">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={cn(
            "flex gap-4 rounded-2xl border p-4",
            step.temp === "hot" ? "border-hot/20 bg-hot-soft/60" : "border-cold/20 bg-cold-soft/60",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <KudosMark temp={step.temp} size="md" />
            <span className="font-mono text-[0.6rem] text-muted-foreground">0{index + 1}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ModeEmpty({ mode }: { mode: Mode }) {
  if (mode === "following") {
    return (
      <EmptyState
        title="Nothing from your people yet"
        body="Follow creators or back a project, and their process updates and new pieces will show up here."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/?mode=backing">Find projects to back</Link>
        </Button>
      </EmptyState>
    );
  }
  if (mode === "rising") {
    return <EmptyState title="Quiet fortnight" body="Nothing has picked up new supporters in the last 14 days. Give some Kudos and start something." />;
  }
  return <EmptyState title="Nothing here yet" body="Be the first. Share a piece or open a project from your studio." />;
}

function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <KudosMark temp="hot" size="lg" />
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
