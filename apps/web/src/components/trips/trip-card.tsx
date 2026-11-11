import Link from "next/link";
import { CalendarDaysIcon, LockIcon, LinkIcon, MapPinIcon } from "lucide-react";
import { formatDistance, formatDuration, TRAVEL_MODE_INFO, type TravelModeKey } from "@skaddosh/api/trips";
import { RoutePreview } from "@/components/trips/route-preview";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";

export type TripCardData = {
  id: string;
  title: string;
  mode: TravelModeKey;
  visibility: "private" | "unlisted" | "public";
  accentColor: string;
  startDate: string | null;
  stopCount: number;
  days: number;
  from: string | null;
  to: string | null;
  points: Array<{ lat: number; lng: number }>;
  geometry: Array<[number, number]> | null;
  distance: number | null;
  duration: number | null;
  straightLineDistance: number;
  owner: { name: string; username: string | null; verified: boolean } | null;
  project: { id: string; title: string } | null;
};

export function formatTripDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TripCard({ trip, showOwner = true }: { trip: TripCardData; showOwner?: boolean }) {
  const mode = TRAVEL_MODE_INFO[trip.mode];
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative">
        <RoutePreview points={trip.points} geometry={trip.geometry} accent={trip.accentColor} className="aspect-[16/10] w-full text-foreground" />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">{mode.label}</span>
        {trip.visibility !== "public" ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            {trip.visibility === "private" ? <LockIcon className="size-3" /> : <LinkIcon className="size-3" />}
            {trip.visibility === "private" ? "Private" : "Link only"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 font-display text-xl leading-tight">{trip.title}</h3>
        {trip.from ? (
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{trip.to ? `${trip.from} → ${trip.to}` : trip.from}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No stops yet</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {trip.distance != null ? formatDistance(trip.distance) : trip.stopCount > 1 ? `~${formatDistance(trip.straightLineDistance)}` : "–"}
          </span>
          {trip.duration != null ? <span>{formatDuration(trip.duration)}</span> : null}
          <span>
            {trip.stopCount} {trip.stopCount === 1 ? "stop" : "stops"}
          </span>
          {trip.days > 1 ? <span>{trip.days} days</span> : null}
          {trip.startDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDaysIcon className="size-3" /> {formatTripDate(trip.startDate)}
            </span>
          ) : null}
        </div>
        {showOwner && trip.owner ? (
          <p className="flex items-center gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{trip.owner.name}</span>
            <VerifiedBadge verified={trip.owner.verified} />
            {trip.project ? <span className="truncate">· {trip.project.title}</span> : null}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
