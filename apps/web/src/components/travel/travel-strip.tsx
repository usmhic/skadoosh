"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { ArrowRightIcon } from "lucide-react";
import { CollectionCard } from "@/components/travel/collection-card";

/** Public travel collections, shown as a row inside the gallery. */
export function TravelStrip() {
  const collections = trpc.trips.explore.useQuery({ limit: 8 });
  if (!collections.data?.length) return null;
  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Travel collections</h2>
          <p className="mt-1 text-sm text-muted-foreground">The places behind the work: photos and stories, pinned where they were made.</p>
        </div>
        <Link href="/travel" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          See all <ArrowRightIcon className="size-4" />
        </Link>
      </div>
      <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {collections.data.map((collection) => (
          <div key={collection.id} className="w-[19rem] shrink-0 snap-start sm:w-[22rem]">
            <CollectionCard collection={collection} />
          </div>
        ))}
      </div>
    </section>
  );
}
