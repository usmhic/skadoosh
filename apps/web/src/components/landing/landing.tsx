"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { useLang } from "@/lib/lang-context";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  FileBadgeIcon,
  HandHeartIcon,
  HandshakeIcon,
  MapIcon,
  MapPinIcon,
  NotebookPenIcon,
  RouteIcon,
  SproutIcon,
  UsersIcon,
} from "lucide-react";
import { Gallery, GallerySkeleton } from "@/components/gallery/gallery-tile";
import { GenerativeCover } from "@/components/gallery/generative-cover";
import { RoutePreview } from "@/components/trips/route-preview";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";
import { formatDistance, TRAVEL_MODE_INFO } from "@skaddosh/api/trips";

const WAYS = [
  { icon: HandHeartIcon, title: "Appreciate", body: "Give Kudos as a thank-you. They go straight to the creator.", tone: "bg-hot-soft text-hot" },
  { icon: SproutIcon, title: "Back early", body: "Commit Kudos to a project in its early days and share in what it earns.", tone: "bg-cold-soft text-cold" },
  { icon: FileBadgeIcon, title: "License", body: "Buy clear permission to use a work, with a certificate anyone can check.", tone: "bg-accent text-accent-foreground" },
  { icon: HandshakeIcon, title: "Contribute", body: "Offer your skills for credit, and a share of income if you both agree.", tone: "bg-muted text-foreground" },
];

export function Landing() {
  const { lang } = useLang();
  const feed = trpc.discover.feed.useQuery({ mode: "for-you", limit: 12 });
  const trips = trpc.trips.explore.useQuery({ limit: 6 });
  const items = feed.data?.items ?? [];
  const featured = items.filter((i) => i.kind === "project").slice(0, 3);
  const featuredTrip = trips.data?.[0];

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[38rem] opacity-60 blur-3xl">
          <div className="mx-auto h-full max-w-5xl bg-[radial-gradient(closest-side,var(--brand-1),transparent),radial-gradient(closest-side,var(--brand-2),transparent)] bg-[length:60%_70%,55%_65%] bg-[position:10%_20%,90%_40%] bg-no-repeat opacity-30" />
        </div>
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
              <BadgeCheckIcon className="size-3.5 text-verified" /> Original work by verified people
            </p>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.02] sm:text-6xl xl:text-7xl">
              Where original work <span className="text-brand">finds its people.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Show what you make, from art and music to software and writing. Get backed early, license your work,
              team up with collaborators, and plan the journeys behind it on a map.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="brand">
                <Link href="/auth/signup">
                  Start your gallery <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explore">Explore the gallery</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              {[
                ["Free", "to join and explore"],
                ["4 ways", "to support work"],
                ["0", "paid boosts, ever"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl">{value}</dt>
                  <dd className="text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Collage of real work and a real trip */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="grid grid-cols-6 grid-rows-6 gap-3 sm:gap-4" style={{ aspectRatio: "1 / 0.92" }}>
              {[0, 1, 2].map((i) => {
                const item = featured[i];
                const area = ["col-span-4 row-span-4", "col-span-2 row-span-2", "col-span-2 row-span-2"][i];
                return (
                  <Link
                    key={i}
                    href={item ? `/projects/${item.id}` : "/explore"}
                    className={`${area} group relative overflow-hidden rounded-3xl bg-muted shadow-lift ring-1 ring-black/5`}
                  >
                    {item && item.kind === "project" ? (
                      <>
                        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                          {item.coverImage ? (
                            <img src={item.coverImage} alt="" className="size-full object-cover" />
                          ) : (
                            <GenerativeCover id={item.id} accent={item.accentColor} medium={item.medium ?? "other"} title={item.title} />
                          )}
                        </div>
                        {i === 0 ? (
                          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-background/90 p-3 backdrop-blur">
                            <p className="truncate font-display text-lg">{item.title}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              {item.creator.name} <VerifiedBadge verified={item.creator.verified} />
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="bg-dots size-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
              <Link
                href={featuredTrip ? `/trips/${featuredTrip.id}` : "/trips"}
                className="col-span-6 row-span-2 flex overflow-hidden rounded-3xl border border-border bg-card shadow-lift"
              >
                <RoutePreview
                  points={featuredTrip?.points ?? []}
                  geometry={featuredTrip?.geometry}
                  accent={featuredTrip?.accentColor}
                  className="h-full w-2/5 shrink-0 text-foreground"
                  grid={false}
                />
                <div className="flex min-w-0 flex-col justify-center gap-1 p-4">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <RouteIcon className="size-3.5" /> Trip
                  </p>
                  <p className="truncate font-display text-lg">{featuredTrip?.title ?? "Plan a trip"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {featuredTrip ? `${featuredTrip.stopCount} stops · ${formatDistance(featuredTrip.distance ?? featuredTrip.straightLineDistance)}` : "Routes, stops, and days"}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Four ways */}
      <section className="border-y border-border/70 bg-card/50">
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Support, clearly</p>
            <h2 className="mt-2 text-balance font-display text-4xl sm:text-5xl">Four ways to back the work you love.</h2>
            <p className="mt-4 text-muted-foreground">
              Each one does something different, and none of them quietly turns into ownership. You always know what you&apos;re
              giving and what you get.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS.map(({ icon: Icon, title, body, tone }) => (
              <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-0.5">
                <span className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <Link href="/how-it-works" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            How it works <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* Trips */}
      <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-last lg:order-first">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift">
              <RoutePreview
                points={featuredTrip?.points ?? []}
                geometry={featuredTrip?.geometry}
                accent={featuredTrip?.accentColor}
                numbered
                className="aspect-[4/3] w-full text-foreground"
              />
              {featuredTrip ? (
                <div className="flex items-center justify-between gap-4 border-t border-border p-5">
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl">{featuredTrip.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {TRAVEL_MODE_INFO[featuredTrip.mode].label} · {featuredTrip.stopCount} stops · {featuredTrip.days} {featuredTrip.days === 1 ? "day" : "days"}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-9 shrink-0">
                    <Link href={`/trips/${featuredTrip.id}`}>Open</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">New: Trips</p>
            <h2 className="mt-2 text-balance font-display text-4xl sm:text-5xl">Plan the journey behind the work.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              A field trip, a tour, a sketching ride. Search places, drop pins on the map, and get real routes for driving,
              cycling, walking, or wheelchair. Organise stops into days and share the plan.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: MapPinIcon, text: "Search places or tap the map to add stops" },
                { icon: RouteIcon, text: "Routes, distances, and travel times for each leg" },
                { icon: NotebookPenIcon, text: "Days, notes, and how long you'll stay" },
                { icon: UsersIcon, text: "Share publicly, link it to a project, or copy someone's route" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="brand" size="lg">
                <Link href="/auth/signup">
                  <MapIcon className="size-4" /> Plan a trip
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/trips">Browse trips</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="border-t border-border/70 bg-card/40">
        <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">In the gallery</p>
              <h2 className="mt-2 font-display text-4xl sm:text-5xl">Fresh from the studio.</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/explore">
                See everything <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10">{feed.isLoading ? <GallerySkeleton count={6} /> : <Gallery items={items.slice(0, 8)} lang={lang} />}</div>
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-16 text-center text-white shadow-lift sm:px-12">
          <div aria-hidden className="bg-dots absolute inset-0 opacity-30 mix-blend-overlay" />
          <h2 className="relative mx-auto max-w-3xl text-balance font-display text-4xl sm:text-5xl">
            Your work deserves people who care about it.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/85">
            Join free. Verify once if you want to publish and sell licences. Exploring and giving Kudos never needs it.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Link href="/auth/signup">Start your gallery</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
