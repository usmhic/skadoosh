import Link from "next/link";
import { CameraIcon, LinkIcon, LockIcon, MapPinIcon } from "lucide-react";
import { formatDistance, type TravelModeKey } from "@skaddosh/api/trips";
import { RoutePreview } from "@/components/travel/route-preview";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";

export type CollectionCardData = {
  id: string;
  title: string;
  summary: string;
  mode: TravelModeKey;
  visibility: "private" | "unlisted" | "public";
  accentColor: string;
  startDate: string | null;
  cover: string | null;
  photoCount: number;
  previewPhotos: string[];
  stopCount: number;
  from: string | null;
  to: string | null;
  points: Array<{ lat: number; lng: number }>;
  geometry: Array<[number, number]> | null;
  distance: number | null;
  straightLineDistance: number;
  owner: { name: string; username: string | null; verified: boolean } | null;
  project: { id: string; title: string } | null;
};

/** "March 2026" from an ISO date. */
export function formatMonth(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * A travel collection in the gallery: led by its photos, with the journey drawn underneath when
 * there are no photos yet.
 */
export function CollectionCard({ collection: c, showOwner = true }: { collection: CollectionCardData; showOwner?: boolean }) {
  const thumbs = c.previewPhotos.filter((url) => url !== c.cover).slice(0, 3);
  const distance = c.distance ?? (c.stopCount > 1 ? c.straightLineDistance : null);
  return (
    <Link
      href={`/travel/${c.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {c.cover ? (
          <img src={c.cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <RoutePreview points={c.points} geometry={c.geometry} accent={c.accentColor} className="size-full text-foreground" />
        )}
        {c.cover && c.points.length > 1 ? (
          <div className="absolute bottom-3 right-3 h-16 w-24 overflow-hidden rounded-xl border border-white/70 bg-background/90 shadow-soft backdrop-blur">
            <RoutePreview points={c.points} geometry={c.geometry} accent={c.accentColor} grid={false} className="size-full text-foreground" />
          </div>
        ) : null}
        {c.visibility !== "public" ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            {c.visibility === "private" ? <LockIcon className="size-3" /> : <LinkIcon className="size-3" />}
            {c.visibility === "private" ? "Private" : "Link only"}
          </span>
        ) : null}
      </div>
      {thumbs.length ? (
        <div className="grid grid-cols-3 gap-1 px-1 pt-1">
          {thumbs.map((url) => (
            <img key={url} src={url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="line-clamp-2 font-display text-xl leading-tight">{c.title}</h3>
        {c.summary ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{c.summary}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3" />
            {c.stopCount} {c.stopCount === 1 ? "place" : "places"}
          </span>
          {c.photoCount ? (
            <span className="inline-flex items-center gap-1">
              <CameraIcon className="size-3" /> {c.photoCount}
            </span>
          ) : null}
          {distance != null ? <span>{formatDistance(distance)}</span> : null}
          {c.startDate ? <span>{formatMonth(c.startDate)}</span> : null}
        </div>
        {showOwner && c.owner ? (
          <p className="flex items-center gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{c.owner.name}</span>
            <VerifiedBadge verified={c.owner.verified} />
            {c.project ? <span className="truncate">· {c.project.title}</span> : null}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
