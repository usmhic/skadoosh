"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Loader2Icon, MapPinIcon } from "lucide-react";
import { CollectionCard } from "@/components/travel/collection-card";

/** Travel collections linked to a project: where the work was researched, recorded, or made. */
export function ProjectTravel({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const router = useRouter();
  const collections = trpc.trips.forProject.useQuery({ projectId });
  const create = trpc.trips.create.useMutation({ onSuccess: ({ id }) => router.push(`/travel/${id}`) });
  if (!collections.data || (!collections.data.length && !isOwner)) return null;

  return (
    <section className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Places behind this work</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Photos and stories from where it was researched, recorded, or made.</p>
        </div>
        {isOwner ? (
          <Button variant="outline" size="sm" className="h-9" disabled={create.isPending} onClick={() => create.mutate({ projectId, title: "Places behind the work" })}>
            {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MapPinIcon className="size-4" />} New travel collection
          </Button>
        ) : null}
      </div>
      {collections.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {collections.data.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} showOwner={false} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-3xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
          No public travel collections yet. Make one public to show it here.
        </p>
      )}
    </section>
  );
}
