"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { ArrowRightIcon } from "lucide-react";
import { CircleIcon } from "@/components/discovery/circle-icon";

export default function CirclesPage() {
  const { data: circles, isLoading } = trpc.discover.circles.useQuery();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Circles</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Find your craft&apos;s people</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Circles gather pieces and projects by craft, so a poet can find poets, a type designer can find
          other type nerds, and everyone can find something new to back.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted" />)
          : circles?.map((circle) => (
              <Link
                key={circle.slug}
                href={`/circles/${circle.slug}`}
                className="group flex flex-col rounded-3xl border border-border bg-card p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
              >
                <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <CircleIcon icon={circle.icon} className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold">{circle.name}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{circle.blurb}</p>
                <p className="mt-auto flex items-center gap-1 pt-4 text-xs text-muted-foreground">
                  {circle.items} pieces & projects · {circle.creators} creators
                  <ArrowRightIcon className="ml-auto size-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            ))}
      </div>
    </div>
  );
}
