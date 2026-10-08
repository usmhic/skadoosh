"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { ArrowLeftIcon } from "lucide-react";
import { CircleIcon } from "@/components/discovery/circle-icon";
import { DiscoverHome } from "@/components/discovery/discover-home";

export default function CirclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: circle, isLoading } = trpc.discover.circle.useQuery({ slug });

  if (!isLoading && !circle) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-display text-2xl font-semibold">This circle doesn&apos;t exist</p>
        <Link href="/circles" className="mt-4 inline-block text-sm text-muted-foreground underline">
          See all circles
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="border-b border-border bg-card/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/circles" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-3.5" /> All circles
          </Link>
          <div className="mt-4 flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              {circle ? <CircleIcon icon={circle.icon} className="size-6" /> : null}
            </span>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{circle?.name ?? " "}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{circle?.blurb}</p>
            </div>
          </div>
        </div>
      </section>
      <Suspense>
        <DiscoverHome circle={slug} />
      </Suspense>
    </div>
  );
}
