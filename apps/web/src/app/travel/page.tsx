"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { CameraIcon, Loader2Icon, MapPinIcon, PlusIcon } from "lucide-react";
import { CollectionCard } from "@/components/travel/collection-card";
import { ActionError } from "@/components/action-error";

export default function TravelPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const mine = trpc.trips.mine.useQuery(undefined, { enabled: Boolean(session) });
  const explore = trpc.trips.explore.useQuery({ limit: 24 });
  const create = trpc.trips.create.useMutation({ onSuccess: ({ id }) => router.push(`/travel/${id}`) });
  const start = () => (session ? create.mutate({}) : router.push("/auth/signup"));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-20 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 pb-8 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <MapPinIcon className="size-4" /> Travel collections
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">The places behind the work.</h1>
            <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
              Photos, sketches, and stories pinned where they were made, in the order they happened.
            </p>
          </div>
          <Button variant="brand" size="lg" onClick={start} disabled={create.isPending} className="self-start sm:self-auto">
            {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            New collection
          </Button>
        </header>
        <ActionError error={create.error} />

        {session ? (
          <section className="mb-16">
            <h2 className="font-display text-2xl">Your collections</h2>
            {mine.isLoading ? (
              <CardSkeletons count={3} />
            ) : mine.data?.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {mine.data.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} showOwner={false} />
                ))}
              </div>
            ) : (
              <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <CameraIcon className="size-6" />
                </span>
                <div>
                  <p className="font-display text-xl">No travel collections yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Pick the places from a journey, add your photos and their stories, and share them as one collection.
                  </p>
                </div>
                <Button variant="outline" onClick={start} disabled={create.isPending}>
                  <PlusIcon className="size-4" /> Start your first collection
                </Button>
              </div>
            )}
          </section>
        ) : null}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-2xl">From the community</h2>
            {!session && !sessionPending ? (
              <Link href="/auth/login" className="shrink-0 text-sm font-medium text-primary hover:underline">
                Sign in to share your own
              </Link>
            ) : null}
          </div>
          {explore.isLoading ? (
            <CardSkeletons count={6} />
          ) : explore.data?.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {explore.data.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No public travel collections yet.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function CardSkeletons({ count }: { count: number }) {
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-96 animate-pulse rounded-3xl bg-muted" />
      ))}
    </div>
  );
}
