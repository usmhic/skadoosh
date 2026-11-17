"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@skaddosh/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@skaddosh/ui/components/ui/dropdown-menu";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  AccessibilityIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BikeIcon,
  CameraIcon,
  CarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  FootprintsIcon,
  GlobeIcon,
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  MapPinIcon,
  MountainIcon,
  MountainSnowIcon,
  MoreHorizontalIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { formatDistance, haversineMeters, TRAVEL_MODE_INFO, TRIP_LIMITS, type TravelModeKey } from "@skaddosh/api/trips";
import { ActionError } from "@/components/action-error";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";
import { ImageUpload } from "@/components/studio/image-upload";
import { formatMonth } from "@/components/travel/collection-card";

const TravelMap = dynamic(() => import("@/components/travel/trip-map").then((m) => m.TripMap), {
  ssr: false,
  loading: () => <div className="bg-dots absolute inset-0 animate-pulse bg-muted" />,
});

const MODE_ICONS: Record<TravelModeKey, LucideIcon> = {
  "driving-car": CarIcon,
  "cycling-regular": BikeIcon,
  "cycling-electric": ZapIcon,
  "cycling-mountain": MountainIcon,
  "foot-walking": FootprintsIcon,
  "foot-hiking": MountainSnowIcon,
  wheelchair: AccessibilityIcon,
};

const VISIBILITY = {
  private: { label: "Private", hint: "Only you", icon: LockIcon },
  unlisted: { label: "Link only", hint: "Anyone with the link", icon: LinkIcon },
  public: { label: "Public", hint: "In the gallery and on your profile", icon: GlobeIcon },
} as const;

const ACCENTS = ["#6d4aff", "#e8573f", "#d63a7a", "#e8a33a", "#2f8a5f", "#3a74ad", "#17171a"];

type Photo = { url: string; caption: string };
type Place = { id: string; name: string; address: string; lat: number; lng: number; story: string; photos: Photo[] };
type Lightbox = { placeIndex: number; photoIndex: number } | null;

export function TravelCollection({ tripId }: { tripId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const config = trpc.trips.config.useQuery();
  const query = trpc.trips.byId.useQuery({ id: tripId }, { retry: false });
  const c = query.data;
  const owner = Boolean(c?.isOwner);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const [error, setError] = useState<{ message: string; data?: { code?: string } } | null>(null);

  const refresh = () => utils.trips.byId.invalidate({ id: tripId });
  const onError = (e: { message: string; data?: { code?: string } | null }) => setError({ message: e.message, data: e.data ?? undefined });
  const update = trpc.trips.update.useMutation({ onSuccess: refresh, onError });
  const addStop = trpc.trips.addStop.useMutation({
    onSuccess: ({ id }) => {
      setSelectedId(id);
      return refresh();
    },
    onError,
  });
  const updateStop = trpc.trips.updateStop.useMutation({ onSuccess: refresh, onError });
  const removeStop = trpc.trips.removeStop.useMutation({ onSuccess: refresh, onError });
  const reorder = trpc.trips.reorder.useMutation({ onSuccess: refresh, onError });
  const remove = trpc.trips.delete.useMutation({ onSuccess: () => router.push("/travel"), onError });
  const duplicate = trpc.trips.duplicate.useMutation({ onSuccess: ({ id }) => router.push(`/travel/${id}`), onError });
  const route = trpc.trips.route.useMutation({ onSuccess: () => refresh(), onError: (e) => setError({ message: e.message }) });
  const reverse = utils.trips.reverse;

  // Ask for a fresh journey line when places or the travel mode change. The server only calls
  // OpenRouteService when its cached line doesn't match, so repeating this is cheap.
  const lastRequested = useRef("");
  const stopsKey = c ? `${c.mode}|${c.stops.map((s) => `${s.lat},${s.lng}`).join(";")}` : "";
  useEffect(() => {
    if (!c?.routeStale || !config.data?.routing || route.isPending || lastRequested.current === stopsKey) return;
    lastRequested.current = stopsKey;
    route.mutate({ tripId });
  }, [c?.routeStale, config.data?.routing, stopsKey, tripId, route]);

  if (query.isLoading) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }
  if (!c) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-3xl">Collection not found</p>
          <p className="text-sm text-muted-foreground">It may be private, or it was deleted.</p>
          <Button asChild variant="outline">
            <Link href="/travel">Back to travel</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const places = c.stops as Place[];
  const accent = c.accentColor;
  const routing = config.data?.routing ?? false;
  const photoCount = places.reduce((t, p) => t + p.photos.length, 0);
  const distance = c.route?.distance ?? (places.length > 1 ? c.straightLineDistance : null);
  const busy = addStop.isPending || removeStop.isPending || reorder.isPending;
  const ModeIcon = MODE_ICONS[c.mode];
  const center = places.length ? places[Math.floor(places.length / 2)] : undefined;

  const legDistance = (index: number) => {
    const leg = c.route?.legs[index];
    if (leg) return { distance: leg.distance, exact: true };
    const a = places[index];
    const b = places[index + 1];
    return a && b ? { distance: haversineMeters(a, b), exact: false } : null;
  };
  const move = (index: number, delta: number) => {
    const ids = places.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate({ tripId, stopIds: ids });
  };
  const dropOn = (draggedId: string, targetIndex: number) => {
    const ids = places.map((s) => s.id).filter((id) => id !== draggedId);
    ids.splice(targetIndex, 0, draggedId);
    if (ids.join() !== places.map((s) => s.id).join()) reorder.mutate({ tripId, stopIds: ids });
  };
  const addFromMap = async (lat: number, lng: number) => {
    setPicking(false);
    try {
      const place = await reverse.fetch({ lat, lng });
      addStop.mutate({ tripId, name: place.name, address: place.label, lat, lng });
    } catch (e) {
      onError(e as { message: string });
    }
  };

  return (
    <Shell>
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map */}
        <div className="relative h-[40vh] shrink-0 border-b border-border lg:order-2 lg:h-auto lg:flex-1 lg:border-b-0">
          <TravelMap
            className="absolute inset-0"
            stops={places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name, photo: p.photos[0]?.url ?? null }))}
            geometry={c.route?.geometry ?? null}
            accent={accent}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            onMapClick={owner && picking ? (lat, lng) => void addFromMap(lat, lng) : undefined}
            onMoveStop={owner ? (id, lat, lng) => updateStop.mutate({ id, lat, lng }) : undefined}
            fitKey={`${c.id}:${places.length}`}
            picking={picking}
          />
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap items-start justify-between gap-2">
            {picking ? (
              <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lift">
                <CrosshairIcon className="size-4" /> Tap the map where it happened
                <button type="button" onClick={() => setPicking(false)} aria-label="Cancel" className="ml-1 rounded-full p-0.5 hover:bg-background/20">
                  <XIcon className="size-4" />
                </button>
              </p>
            ) : (
              <span />
            )}
            {route.isPending ? (
              <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
                <Loader2Icon className="size-3.5 animate-spin" /> Drawing the journey…
              </p>
            ) : null}
          </div>
        </div>

        {/* Collection */}
        <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:order-1 lg:w-[480px] lg:flex-none lg:border-r lg:border-border xl:w-[520px]">
          {c.cover ? (
            <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-muted">
              <img src={c.cover} alt="" className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
          ) : null}
          <div className="space-y-6 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <Link href="/travel" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeftIcon className="size-4" /> Travel
              </Link>
              <div className="flex items-center gap-1.5">
                {owner ? (
                  <VisibilityMenu value={c.visibility} onChange={(visibility) => update.mutate({ id: tripId, visibility })} />
                ) : session ? (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => duplicate.mutate({ id: tripId })} disabled={duplicate.isPending}>
                    {duplicate.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CopyIcon className="size-4" />} Save a copy
                  </Button>
                ) : null}
                <CollectionMenu
                  owner={owner}
                  accent={accent}
                  hasCover={Boolean(c.coverImage)}
                  onDuplicate={() => duplicate.mutate({ id: tripId })}
                  onDelete={() => {
                    if (window.confirm("Delete this travel collection? This can't be undone.")) remove.mutate({ id: tripId });
                  }}
                  onAccent={(accentColor) => update.mutate({ id: tripId, accentColor })}
                  onClearCover={() => update.mutate({ id: tripId, coverImage: null })}
                />
              </div>
            </div>

            {/* Title, who, when */}
            <div>
              {owner ? (
                <EditableText
                  value={c.title}
                  onSave={(title) => update.mutate({ id: tripId, title })}
                  className="w-full bg-transparent font-display text-3xl leading-tight outline-none focus:underline focus:decoration-primary/40 focus:underline-offset-8"
                  ariaLabel="Collection title"
                />
              ) : (
                <h1 className="font-display text-3xl leading-tight">{c.title}</h1>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {c.owner ? (
                  <>
                    by{" "}
                    <Link href={c.owner.username ? `/${c.owner.username}` : "#"} className="font-medium text-foreground hover:underline">
                      {c.owner.name}
                    </Link>
                    <VerifiedBadge verified={c.owner.verified} />
                  </>
                ) : null}
                {c.project ? (
                  <>
                    <span>· for</span>
                    <Link href={`/projects/${c.project.id}`} className="font-medium text-foreground hover:underline">
                      {c.project.title}
                    </Link>
                  </>
                ) : null}
                {!owner && c.startDate ? <span>· {formatMonth(c.startDate)}</span> : null}
              </p>
            </div>

            {owner ? (
              <EditableText
                multiline
                value={c.summary}
                placeholder="What's this collection about? Where did the journey take you?"
                onSave={(summary) => update.mutate({ id: tripId, summary })}
                className="min-h-20 w-full resize-y rounded-2xl border border-border bg-card px-3.5 py-2.5 font-serif text-base leading-7 outline-none focus:border-ring"
                ariaLabel="About this collection"
              />
            ) : c.summary ? (
              <p className="font-serif text-lg leading-8">{c.summary}</p>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <Stat label={places.length === 1 ? "Place" : "Places"} value={String(places.length)} />
              <Stat label={photoCount === 1 ? "Photo" : "Photos"} value={String(photoCount)} />
              <Stat label={c.route ? "Journey" : "As the crow flies"} value={distance != null ? formatDistance(distance) : "–"} />
            </div>

            {owner ? (
              <div className="space-y-3 rounded-3xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">When</span>
                    <input
                      type="month"
                      value={c.startDate?.slice(0, 7) ?? ""}
                      onChange={(e) => update.mutate({ id: tripId, startDate: e.target.value ? `${e.target.value}-01` : null })}
                      className="bg-transparent font-medium outline-none"
                      aria-label="When it happened"
                    />
                  </label>
                  <ModeSelect value={c.mode} onChange={(mode) => update.mutate({ id: tripId, mode })} />
                </div>
                <ProjectLink tripId={tripId} projectId={c.projectId} onChange={(projectId) => update.mutate({ id: tripId, projectId })} />
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ModeIcon className="size-4" /> Travelled by {TRAVEL_MODE_INFO[c.mode].label.toLowerCase()}
              </p>
            )}

            {/* Add places */}
            {owner ? (
              <div className="space-y-2">
                <PlaceSearch
                  routing={routing}
                  near={center ? { lat: center.lat, lng: center.lng } : undefined}
                  disabled={busy || places.length >= (config.data?.maxStops ?? TRIP_LIMITS.MAX_STOPS)}
                  onPick={(p) => addStop.mutate({ tripId, name: p.name, address: p.label, lat: p.lat, lng: p.lng })}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant={picking ? "default" : "outline"} className="h-9" onClick={() => setPicking((p) => !p)}>
                    <CrosshairIcon className="size-4" /> {picking ? "Tap the map…" : "Pin on the map"}
                  </Button>
                  {addStop.isPending ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>
              </div>
            ) : null}
            <JourneyStatus routing={routing} c={c} pending={route.isPending} onRetry={() => { lastRequested.current = ""; route.mutate({ tripId }); }} />
            <ActionError error={error} />

            {/* Places */}
            {places.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
                <CameraIcon className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-display text-xl">Where did it start?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {owner ? "Search for a place or pin it on the map, then add your photos and the story." : "No places yet."}
                </p>
              </div>
            ) : (
              <ol>
                {places.map((place, index) => {
                  const leg = index < places.length - 1 ? legDistance(index) : null;
                  return (
                    <li key={place.id} id={`place-${place.id}`} className="scroll-mt-4">
                      <PlaceCard
                        place={place}
                        index={index}
                        total={places.length}
                        accent={accent}
                        owner={owner}
                        selected={selectedId === place.id}
                        coverUrl={c.coverImage}
                        onSelect={() => setSelectedId(selectedId === place.id ? null : place.id)}
                        onOpenPhoto={(photoIndex) => setLightbox({ placeIndex: index, photoIndex })}
                        onUpdate={(fields) => updateStop.mutate({ id: place.id, ...fields })}
                        onSetCover={(url) => update.mutate({ id: tripId, coverImage: url })}
                        onRemove={() => {
                          if (!place.photos.length || window.confirm(`Remove ${place.name} and its photos?`)) removeStop.mutate({ id: place.id });
                        }}
                        onMove={(delta) => move(index, delta)}
                        onDrop={(draggedId) => dropOn(draggedId, index)}
                      />
                      {leg ? (
                        <div className="flex items-center gap-3 py-1.5 pl-[1.15rem]">
                          <span
                            className="h-7 w-0.5 rounded-full"
                            style={{ background: leg.exact ? accent : `repeating-linear-gradient(${accent} 0 3px, transparent 3px 7px)` }}
                          />
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ModeIcon className="size-3.5" /> {leg.exact ? "" : "~"}
                            {formatDistance(leg.distance)}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <PhotoLightbox places={places} state={lightbox} onChange={setLightbox} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header />
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
      <p className="font-display text-lg leading-tight tabular-nums">{value}</p>
      <p className="truncate text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function ModeSelect({ value, onChange }: { value: TravelModeKey; onChange: (mode: TravelModeKey) => void }) {
  const Icon = MODE_ICONS[value];
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      <span className="sr-only">How you travelled</span>
      <select value={value} onChange={(e) => onChange(e.target.value as TravelModeKey)} className="bg-transparent font-medium outline-none">
        {(Object.keys(TRAVEL_MODE_INFO) as TravelModeKey[]).map((mode) => (
          <option key={mode} value={mode}>
            {TRAVEL_MODE_INFO[mode].label}
          </option>
        ))}
      </select>
    </label>
  );
}

function JourneyStatus({
  routing,
  c,
  pending,
  onRetry,
}: {
  routing: boolean;
  c: { stops: unknown[]; route: unknown; routeError: string | null };
  pending: boolean;
  onRetry: () => void;
}) {
  if (c.stops.length < 2 || pending || c.route) return null;
  if (!routing) {
    return <p className="text-xs leading-5 text-muted-foreground">The journey is drawn as straight lines between places.</p>;
  }
  if (c.routeError) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span>Couldn&apos;t trace the road between some places, so the journey is drawn as straight lines. {c.routeError}</span>
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold text-foreground underline-offset-2 hover:underline">
          Retry
        </button>
      </div>
    );
  }
  return null;
}

function PlaceCard({
  place,
  index,
  total,
  accent,
  owner,
  selected,
  coverUrl,
  onSelect,
  onOpenPhoto,
  onUpdate,
  onSetCover,
  onRemove,
  onMove,
  onDrop,
}: {
  place: Place;
  index: number;
  total: number;
  accent: string;
  owner: boolean;
  selected: boolean;
  coverUrl: string | null;
  onSelect: () => void;
  onOpenPhoto: (photoIndex: number) => void;
  onUpdate: (fields: { name?: string; story?: string; photos?: Photo[] }) => void;
  onSetCover: (url: string) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onDrop: (draggedId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const shown = selected ? place.photos : place.photos.slice(0, 4);
  const hidden = place.photos.length - shown.length;
  return (
    <div
      draggable={owner}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", place.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!owner) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id && id !== place.id) onDrop(id);
      }}
      className={cn(
        "overflow-hidden rounded-3xl border bg-card transition-[box-shadow,border-color]",
        selected ? "border-transparent shadow-lift ring-2" : "border-border hover:border-foreground/20",
        dragOver && "ring-2 ring-primary/40",
      )}
      style={selected ? ({ "--tw-ring-color": accent } as React.CSSProperties) : undefined}
    >
      <button type="button" onClick={onSelect} aria-expanded={selected} className="flex w-full items-center gap-3 p-3.5 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: accent }}>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg leading-tight">{place.name}</span>
          {place.address && place.address !== place.name ? <span className="block truncate text-xs text-muted-foreground">{place.address}</span> : null}
        </span>
        {place.photos.length ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CameraIcon className="size-3.5" /> {place.photos.length}
          </span>
        ) : null}
      </button>

      {shown.length ? (
        <div className={cn("grid gap-1 px-1", shown.length === 1 ? "grid-cols-1" : "grid-cols-2", selected && shown.length > 2 && "grid-cols-3")}>
          {shown.map((p, i) => (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => onOpenPhoto(i)}
              aria-label={p.caption || `Photo ${i + 1} of ${place.name}`}
              className={cn("group relative overflow-hidden rounded-xl bg-muted", shown.length === 1 ? "aspect-[16/10]" : "aspect-square")}
            >
              <img src={p.url} alt={p.caption} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              {!selected && i === shown.length - 1 && hidden > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">+{hidden}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {place.story && !selected ? <p className="line-clamp-3 px-4 pb-4 pt-3 font-serif text-[0.95rem] leading-6">{place.story}</p> : null}
      {!place.story && !shown.length && !selected ? <div className="h-0.5" /> : null}

      {selected ? (
        <div className="space-y-3 px-4 pb-4 pt-3">
          {owner ? (
            <>
              <EditableText value={place.name} onSave={(name) => name && onUpdate({ name })} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-ring" ariaLabel="Place name" />
              <EditableText
                multiline
                value={place.story}
                placeholder="The story of this place: what you saw, made, or heard here."
                onSave={(story) => onUpdate({ story })}
                className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 font-serif text-[0.95rem] leading-6 outline-none focus:border-ring"
                ariaLabel="Story of this place"
              />
              <PhotoEditor photos={place.photos} coverUrl={coverUrl} onChange={(photos) => onUpdate({ photos })} onSetCover={onSetCover} />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move earlier">
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move later">
                    <ArrowDownIcon className="size-4" />
                  </Button>
                </div>
                <Button type="button" size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={onRemove}>
                  <Trash2Icon className="size-4" /> Remove place
                </Button>
              </div>
            </>
          ) : place.story ? (
            <p className="whitespace-pre-line font-serif text-[0.95rem] leading-7">{place.story}</p>
          ) : null}
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=15/${place.lat}/${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3.5" /> Open in OpenStreetMap
          </a>
        </div>
      ) : null}
    </div>
  );
}

/** Add, caption, and remove a place's photos, and choose the collection cover. */
function PhotoEditor({
  photos,
  coverUrl,
  onChange,
  onSetCover,
}: {
  photos: Photo[];
  coverUrl: string | null;
  onChange: (photos: Photo[]) => void;
  onSetCover: (url: string) => void;
}) {
  const full = photos.length >= TRIP_LIMITS.MAX_PHOTOS_PER_PLACE;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Photos ({photos.length}/{TRIP_LIMITS.MAX_PHOTOS_PER_PLACE})
      </p>
      {photos.map((p, i) => (
        <div key={`${p.url}-${i}`} className="flex items-center gap-2">
          <img src={p.url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
          <CaptionInput value={p.caption} onSave={(caption) => onChange(photos.map((x, j) => (j === i ? { ...x, caption } : x)))} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-8", coverUrl === p.url && "text-primary")}
            onClick={() => onSetCover(p.url)}
            aria-label="Use as cover"
            title="Use as the collection cover"
          >
            <StarIcon className="size-4" fill={coverUrl === p.url ? "currentColor" : "none"} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Remove photo">
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}
      {!full ? (
        <ImageUpload value={null} folder="travel" label="Add a photo" aspectRatio="4/3" onChange={(url) => url && onChange([...photos, { url, caption: "" }])} />
      ) : null}
    </div>
  );
}

function CaptionInput({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== value && onSave(draft.trim())}
      placeholder="Caption"
      maxLength={280}
      className="h-9 flex-1"
      aria-label="Photo caption"
    />
  );
}

/** Full-size photos, place by place, with arrow-key navigation through the whole collection. */
function PhotoLightbox({ places, state, onChange }: { places: Place[]; state: Lightbox; onChange: (state: Lightbox) => void }) {
  const flat = places.flatMap((p, placeIndex) => p.photos.map((photo, photoIndex) => ({ photo, place: p, placeIndex, photoIndex })));
  const current = state ? flat.findIndex((f) => f.placeIndex === state.placeIndex && f.photoIndex === state.photoIndex) : -1;
  const item = current >= 0 ? flat[current] : undefined;
  const go = (delta: number) => {
    const next = flat[(current + delta + flat.length) % flat.length];
    if (next) onChange({ placeIndex: next.placeIndex, photoIndex: next.photoIndex });
  };
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent className="gap-0 overflow-hidden bg-black p-0 text-white sm:max-w-5xl" showCloseButton={false}>
        <DialogTitle className="sr-only">{item?.place.name ?? "Photo"}</DialogTitle>
        {item ? (
          <>
            <div className="relative flex max-h-[78vh] items-center justify-center bg-black">
              <img src={item.photo.url} alt={item.photo.caption} className="max-h-[78vh] w-auto max-w-full object-contain" />
              {flat.length > 1 ? (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25">
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25">
                    <ChevronRightIcon className="size-5" />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => onChange(null)} aria-label="Close" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPinIcon className="size-3.5" /> {item.placeIndex + 1}. {item.place.name}
                </p>
                {item.photo.caption ? <p className="mt-1 text-sm text-white/75">{item.photo.caption}</p> : null}
              </div>
              <p className="shrink-0 text-xs tabular-nums text-white/60">
                {current + 1} / {flat.length}
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** A text field that saves when it loses focus (or on Enter for single lines). */
function EditableText({
  value,
  onSave,
  className,
  multiline = false,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onSave(next);
  };
  return multiline ? (
    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} placeholder={placeholder} aria-label={ariaLabel} className={className} maxLength={2000} />
  ) : (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={120}
      className={className}
    />
  );
}

type SearchPlace = { id: string; name: string; label: string; lat: number; lng: number };

/** Place search backed by OpenRouteService autocomplete (through our API). */
function PlaceSearch({
  routing,
  near,
  disabled,
  onPick,
}: {
  routing: boolean;
  near?: { lat: number; lng: number };
  disabled?: boolean;
  onPick: (place: SearchPlace) => void;
}) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const results = trpc.trips.search.useQuery({ q: debounced, near }, { enabled: routing && debounced.length >= 2, staleTime: 60_000 });
  const found = results.data ?? [];
  const pick = (place: SearchPlace) => {
    onPick(place);
    setText("");
    setDebounced("");
    setOpen(false);
  };

  if (!routing) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        <SearchIcon className="size-4 shrink-0" /> Place search isn&apos;t switched on here. Pin places on the map instead.
      </p>
    );
  }
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!found.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % found.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + found.length) % found.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(found[active]!);
          }
        }}
        placeholder="Add a place: a town, landmark, or address"
        aria-label="Search for a place to add"
        role="combobox"
        aria-expanded={open && found.length > 0}
        className="h-11 pl-10"
      />
      {open && debounced.length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-lift" role="listbox">
          {results.isFetching && !found.length ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Searching…
            </p>
          ) : found.length ? (
            found.map((place, i) => (
              <button
                key={place.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-left", i === active ? "bg-muted" : "hover:bg-muted")}
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{place.label}</span>
                </span>
              </button>
            ))
          ) : results.error ? (
            <p className="px-4 py-3 text-sm text-destructive">{results.error.message}</p>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No places found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function VisibilityMenu({ value, onChange }: { value: keyof typeof VISIBILITY; onChange: (value: keyof typeof VISIBILITY) => void }) {
  const Current = VISIBILITY[value].icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-9">
          <Current className="size-4" /> {VISIBILITY[value].label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Who can see this collection</DropdownMenuLabel>
        {(Object.keys(VISIBILITY) as Array<keyof typeof VISIBILITY>).map((key) => {
          const { label, hint, icon: Icon } = VISIBILITY[key];
          return (
            <DropdownMenuItem key={key} onSelect={() => onChange(key)} className="gap-3 rounded-lg">
              <Icon className="size-4" />
              <span className="flex-1">
                <span className="block text-sm">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              {key === value ? <CheckIcon className="size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollectionMenu({
  owner,
  accent,
  hasCover,
  onDuplicate,
  onDelete,
  onAccent,
  onClearCover,
}: {
  owner: boolean;
  accent: string;
  hasCover: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onAccent: (color: string) => void;
  onClearCover: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-9" aria-label="More actions">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(window.location.href)}>
          <LinkIcon /> Copy link
        </DropdownMenuItem>
        {owner ? (
          <>
            <DropdownMenuItem onSelect={onDuplicate}>
              <CopyIcon /> Duplicate
            </DropdownMenuItem>
            {hasCover ? (
              <DropdownMenuItem onSelect={onClearCover}>
                <ImageIcon /> Use the first photo as cover
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Colour</DropdownMenuLabel>
            <div className="flex gap-1.5 px-2 pb-2">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use ${color}`}
                  onClick={() => onAccent(color)}
                  className={cn("size-6 rounded-full ring-offset-2 ring-offset-popover", accent === color && "ring-2 ring-foreground")}
                  style={{ background: color }}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2Icon /> Delete collection
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Link the collection to one of your projects, so it shows on the project page. */
function ProjectLink({ tripId, projectId, onChange }: { tripId: string; projectId: string | null; onChange: (projectId: string | null) => void }) {
  const projects = trpc.projects.mine.useQuery();
  if (!projects.data?.length) return null;
  return (
    <label className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm" htmlFor={`project-${tripId}`}>
      <span className="text-muted-foreground">Part of a project</span>
      <select
        id={`project-${tripId}`}
        value={projectId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="max-w-[60%] truncate bg-transparent text-right font-medium outline-none"
      >
        <option value="">None</option>
        {projects.data.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title || "Untitled project"}
          </option>
        ))}
      </select>
    </label>
  );
}
