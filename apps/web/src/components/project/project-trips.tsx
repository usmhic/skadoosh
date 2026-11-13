"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Loader2Icon, MapIcon } from "lucide-react";
import { TripCard } from "@/components/trips/trip-card";

/** Journeys linked to a project: field trips, tours, shoots. Owners can start one from here. */
export function ProjectTrips({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const router = useRouter();
  const trips = trpc.trips.forProject.useQuery({ projectId });
  const create = trpc.trips.create.useMutation({ onSuccess: ({ id }) => router.push(`/trips/${id}`) });
  if (!trips.data || (!trips.data.length && !isOwner)) return null;

  return (
    <section className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">The journey</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Where this work is being made: the routes, stops, and days behind it.</p>
        </div>
        {isOwner ? (
          <Button variant="outline" size="sm" className="h-9" disabled={create.isPending} onClick={() => create.mutate({ projectId, title: "Field trip" })}>
            {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MapIcon className="size-4" />} Plan a trip
          </Button>
        ) : null}
      </div>
      {trips.data.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {trips.data.map((trip) => (
            <TripCard key={trip.id} trip={trip} showOwner={false} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-3xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
          No public trips yet. Plan one and set it to public to show it here.
        </p>
      )}
    </section>
  );
}
