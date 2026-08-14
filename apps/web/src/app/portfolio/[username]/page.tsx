"use client";

import { use } from "react";
import Link from "next/link";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";

export default function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { data: session } = useSession();
  const { data: profile, isPending } = trpc.portfolios.byUsername.useQuery({ username });
  const { data: mine } = trpc.portfolios.mine.useQuery(undefined, { enabled: !!session });

  if (isPending) {
    return <PortfolioSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This skaddosh portfolio has not been published yet.</p>
          <Button className="mt-6" asChild>
            <Link href="/portfolio/edit">Create your portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const editHref = mine?.portfolio.username === profile.username ? "/portfolio/edit" : undefined;

  return <PortfolioView profile={profile} editHref={editHref} />;
}

function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
          <div className="mt-8 h-16 w-4/5 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-16 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-10 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />
      </main>
    </div>
  );
}
