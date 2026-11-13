"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
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
  BedDoubleIcon,
  BikeIcon,
  CameraIcon,
  CarIcon,
  CheckIcon,
  CopyIcon,
  CrosshairIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FootprintsIcon,
  GlobeIcon,
  GripVerticalIcon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  MapPinIcon,
  MountainIcon,
  MountainSnowIcon,
  MoreHorizontalIcon,
  SearchIcon,
  ShuffleIcon,
  TrainFrontIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import {
  formatDistance,
  formatDuration,
  haversineMeters,
  planDays,
  STOP_KIND_INFO,
  TRAVEL_MODE_INFO,
  type StopKindKey,
  type TravelModeKey,
} from "@skaddosh/api/trips";
import { ActionError } from "@/components/action-error";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";
import { formatTripDate } from "@/components/trips/trip-card";

const TripMap = dynamic(() => import("@/components/trips/trip-map").then((m) => m.TripMap), {
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

const KIND_ICONS: Record<StopKindKey, LucideIcon> = {
  place: MapPinIcon,
  stay: BedDoubleIcon,
  food: UtensilsIcon,
  sight: CameraIcon,
  transport: TrainFrontIcon,
};

const STAY_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720];

const VISIBILITY = {
  private: { label: "Private", hint: "Only you", icon: LockIcon },
  unlisted: { label: "Link only", hint: "Anyone with the link", icon: LinkIcon },
  public: { label: "Public", hint: "Listed in Trips", icon: GlobeIcon },
} as const;

const ACCENTS = ["#6d4aff", "#e8573f", "#d63a7a", "#e8a33a", "#2f8a5f", "#3a74ad", "#17171a"];

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function stayLabel(minutes: number) {
  if (!minutes) return "Passing through";
  return minutes >= 720 ? "Overnight" : formatDuration(minutes * 60);
}

export function TripPlanner({ tripId }: { tripId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const config = trpc.trips.config.useQuery();
  const query = trpc.trips.byId.useQuery({ id: tripId }, { retry: false });
  const trip = query.data;
  const owner = Boolean(trip?.isOwner);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<{ message: string; data?: { code?: string } } | null>(null);

  const refresh = () => utils.trips.byId.invalidate({ id: tripId });
  const onError = (e: { message: string; data?: { code?: string } | null }) => setError({ message: e.message, data: e.data ?? undefined });
  const update = trpc.trips.update.useMutation({ onSuccess: refresh, onError });
  const addStop = trpc.trips.addStop.useMutation({ onSuccess: refresh, onError });
  const updateStop = trpc.trips.updateStop.useMutation({ onSuccess: refresh, onError });
  const removeStop = trpc.trips.removeStop.useMutation({ onSuccess: refresh, onError });
  const reorder = trpc.trips.reorder.useMutation({ onSuccess: refresh, onError });
  const optimize = trpc.trips.optimize.useMutation({ onSuccess: refresh, onError });
  const remove = trpc.trips.delete.useMutation({ onSuccess: () => router.push("/trips"), onError });
  const duplicate = trpc.trips.duplicate.useMutation({ onSuccess: ({ id }) => router.push(`/trips/${id}`), onError });
  const route = trpc.trips.route.useMutation({
    onSuccess: () => refresh(),
    onError: (e) => setError({ message: e.message }),
  });
  const reverse = trpc.useUtils().trips.reverse;

  // Ask for a fresh route whenever the stops or mode change. The server only calls ORS when its
  // cached route doesn't match, so this is cheap to repeat.
  const lastRequested = useRef<string>("");
  const stopsKey = trip ? `${trip.mode}|${trip.stops.map((s) => `${s.lat},${s.lng}`).join(";")}` : "";
  useEffect(() => {
    if (!trip?.routeStale || !config.data?.routing || route.isPending) return;
    if (lastRequested.current === stopsKey) return;
    lastRequested.current = stopsKey;
    route.mutate({ tripId });
  }, [trip?.routeStale, config.data?.routing, stopsKey, tripId, route]);

  const days = useMemo(() => (trip ? planDays(trip.stops, trip.route?.legs ?? null) : []), [trip]);
  const maxDay = trip?.stops.reduce((m, s) => Math.max(m, s.day), 1) ?? 1;
  const center = trip?.stops.length ? trip.stops[Math.floor(trip.stops.length / 2)] : undefined;

  if (query.isLoading) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }
  if (!trip) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-3xl">Trip not found</p>
          <p className="text-sm text-muted-foreground">It may be private, or it was deleted.</p>
          <Button asChild variant="outline">
            <Link href="/trips">Back to trips</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const busy = addStop.isPending || removeStop.isPending || reorder.isPending || optimize.isPending;
  const accent = trip.accentColor;
  const legFor = (index: number) => {
    const leg = trip.route?.legs[index];
    if (leg) return { distance: leg.distance, duration: leg.duration, exact: true };
    const a = trip.stops[index];
    const b = trip.stops[index + 1];
    return a && b ? { distance: haversineMeters(a, b), duration: null, exact: false } : null;
  };
  const move = (index: number, delta: number) => {
    const ids = trip.stops.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate({ tripId, stopIds: ids });
  };
  const dropOn = (draggedId: string, targetIndex: number) => {
    const ids = trip.stops.map((s) => s.id).filter((id) => id !== draggedId);
    ids.splice(targetIndex, 0, draggedId);
    if (ids.join() !== trip.stops.map((s) => s.id).join()) reorder.mutate({ tripId, stopIds: ids });
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

  const ModeIcon = MODE_ICONS[trip.mode];
  const totalDistance = trip.route?.distance ?? (trip.stops.length > 1 ? trip.straightLineDistance : null);
  const routing = config.data?.routing ?? false;

  return (
    <Shell>
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map */}
        <div className="relative h-[44vh] shrink-0 border-b border-border lg:order-2 lg:h-auto lg:flex-1 lg:border-b-0">
          <TripMap
            className="absolute inset-0"
            stops={trip.stops}
            geometry={trip.route?.geometry ?? null}
            accent={accent}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMapClick={owner && picking ? (lat, lng) => void addFromMap(lat, lng) : undefined}
            onMoveStop={owner ? (id, lat, lng) => updateStop.mutate({ id, lat, lng }) : undefined}
            fitKey={`${trip.id}:${trip.stops.length}`}
            picking={picking}
          />
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap items-start justify-between gap-2">
            {picking ? (
              <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lift">
                <CrosshairIcon className="size-4" /> Tap the map to add a stop
                <button type="button" onClick={() => setPicking(false)} aria-label="Cancel" className="ml-1 rounded-full p-0.5 hover:bg-background/20">
                  <XIcon className="size-4" />
                </button>
              </p>
            ) : (
              <span />
            )}
            {route.isPending ? (
              <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
                <Loader2Icon className="size-3.5 animate-spin" /> Working out the route…
              </p>
            ) : null}
          </div>
        </div>

        {/* Plan */}
        <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:order-1 lg:w-[460px] lg:flex-none lg:border-r lg:border-border xl:w-[500px]">
          <div className="space-y-6 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <Link href="/trips" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeftIcon className="size-4" /> Trips
              </Link>
              <div className="flex items-center gap-1.5">
                {owner ? (
                  <VisibilityMenu value={trip.visibility} onChange={(visibility) => update.mutate({ id: tripId, visibility })} />
                ) : session ? (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => duplicate.mutate({ id: tripId })} disabled={duplicate.isPending}>
                    {duplicate.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CopyIcon className="size-4" />} Copy to my trips
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-9" asChild>
                    <Link href="/auth/login">Sign in to copy</Link>
                  </Button>
                )}
                <TripMenu
                  owner={owner}
                  trip={trip}
                  onDuplicate={() => duplicate.mutate({ id: tripId })}
                  onDelete={() => {
                    if (window.confirm("Delete this trip? This can't be undone.")) remove.mutate({ id: tripId });
                  }}
                  onAccent={(accentColor) => update.mutate({ id: tripId, accentColor })}
                />
              </div>
            </div>

            {/* Title and owner */}
            <div>
              {owner ? (
                <EditableText
                  value={trip.title}
                  onSave={(title) => update.mutate({ id: tripId, title })}
                  className="w-full bg-transparent font-display text-3xl leading-tight outline-none focus:underline focus:decoration-primary/40 focus:underline-offset-8"
                  ariaLabel="Trip title"
                />
              ) : (
                <h1 className="font-display text-3xl leading-tight">{trip.title}</h1>
              )}
              {trip.owner ? (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  by{" "}
                  <Link href={trip.owner.username ? `/${trip.owner.username}` : "#"} className="font-medium text-foreground hover:underline">
                    {trip.owner.name}
                  </Link>
                  <VerifiedBadge verified={trip.owner.verified} />
                  {trip.project ? (
                    <>
                      <span>· for</span>
                      <Link href={`/projects/${trip.project.id}`} className="font-medium text-foreground hover:underline">
                        {trip.project.title}
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>

            {/* Travel mode */}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="How you'll travel">
              {(Object.keys(TRAVEL_MODE_INFO) as TravelModeKey[]).map((mode) => {
                const Icon = MODE_ICONS[mode];
                const active = trip.mode === mode;
                if (!owner && !active) return null;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!owner}
                    onClick={() => update.mutate({ id: tripId, mode })}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                      active ? "border-transparent bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" /> {TRAVEL_MODE_INFO[mode].label}
                  </button>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
              <Stat label={trip.route ? "Distance" : "Straight line"} value={totalDistance != null ? `${trip.route ? "" : "~"}${formatDistance(totalDistance)}` : "–"} />
              <Stat label={`${TRAVEL_MODE_INFO[trip.mode].verb[0]!.toUpperCase()}${TRAVEL_MODE_INFO[trip.mode].verb.slice(1)} time`} value={trip.route ? formatDuration(trip.route.duration) : "–"} />
              <Stat label="Stops" value={String(trip.stops.length)} />
              <Stat label="Days" value={String(trip.stops.length ? maxDay : 0)} />
            </div>
            <RouteStatus routing={routing} trip={trip} pending={route.isPending} onRetry={() => { lastRequested.current = ""; route.mutate({ tripId }); }} />

            {/* Start date */}
            {owner ? (
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Starts on</span>
                <input
                  type="date"
                  value={trip.startDate ?? ""}
                  onChange={(e) => update.mutate({ id: tripId, startDate: e.target.value || null })}
                  className="bg-transparent text-right font-medium outline-none"
                />
              </label>
            ) : trip.startDate ? (
              <p className="text-sm text-muted-foreground">Starts {formatTripDate(trip.startDate)}</p>
            ) : null}

            {/* Add stops */}
            {owner ? (
              <div className="space-y-2">
                <PlaceSearch
                  routing={routing}
                  near={center ? { lat: center.lat, lng: center.lng } : undefined}
                  disabled={busy || trip.stops.length >= (config.data?.maxStops ?? 50)}
                  onPick={(place) => addStop.mutate({ tripId, name: place.name, address: place.label, lat: place.lat, lng: place.lng })}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={picking ? "default" : "outline"} className="h-9" onClick={() => setPicking((p) => !p)}>
                    <CrosshairIcon className="size-4" /> {picking ? "Tap the map…" : "Add on the map"}
                  </Button>
                  {routing && trip.stops.length >= 4 ? (
                    <Button type="button" size="sm" variant="outline" className="h-9" disabled={busy} onClick={() => optimize.mutate({ tripId })} title="Keep your first and last stop, and visit the rest in the shortest order">
                      {optimize.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <ShuffleIcon className="size-4" />} Best order
                    </Button>
                  ) : null}
                  {addStop.isPending ? <Loader2Icon className="size-4 animate-spin self-center text-muted-foreground" /> : null}
                </div>
                {optimize.data && !optimize.data.changed ? <p className="text-xs text-muted-foreground">Your stops are already in the best order.</p> : null}
              </div>
            ) : null}

            <ActionError error={error} />

            {/* Itinerary */}
            {trip.stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
                <MapPinIcon className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-display text-xl">Where to first?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {owner ? "Search for a place above, or add one on the map." : "This trip has no stops yet."}
                </p>
              </div>
            ) : (
              <ol className="space-y-6">
                {days.map((plan) => (
                  <li key={plan.day}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2 className="font-display text-lg">
                        Day {plan.day}
                        {trip.startDate ? <span className="ml-2 text-sm font-normal text-muted-foreground">{addDays(trip.startDate, plan.day - 1)}</span> : null}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {plan.distance ? `${formatDistance(plan.distance)} · ${formatDuration(plan.duration)}` : null}
                        {plan.stayMinutes ? `${plan.distance ? " · " : ""}${formatDuration(plan.stayMinutes * 60)} at stops` : null}
                      </p>
                    </div>
                    <ol>
                      {plan.stopIndexes.map((index, i) => {
                        const stop = trip.stops[index]!;
                        const leg = index < trip.stops.length - 1 ? legFor(index) : null;
                        const lastOfDay = i === plan.stopIndexes.length - 1;
                        return (
                          <li key={stop.id}>
                            <StopRow
                              stop={stop}
                              index={index}
                              total={trip.stops.length}
                              accent={accent}
                              owner={owner}
                              selected={selectedId === stop.id}
                              maxDay={maxDay}
                              onSelect={() => setSelectedId(selectedId === stop.id ? null : stop.id)}
                              onUpdate={(fields) => updateStop.mutate({ id: stop.id, ...fields })}
                              onRemove={() => removeStop.mutate({ id: stop.id })}
                              onMove={(delta) => move(index, delta)}
                              onDrop={(draggedId) => dropOn(draggedId, index)}
                            />
                            {leg ? <LegConnector leg={leg} accent={accent} mode={ModeIcon} dayBreak={lastOfDay} /> : null}
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
            )}

            {/* About */}
            <section className="space-y-2 border-t border-border pt-6">
              <h2 className="text-sm font-semibold">About this trip</h2>
              {owner ? (
                <EditableText
                  multiline
                  value={trip.summary}
                  placeholder="What's it for? Who's coming? What should people know?"
                  onSave={(summary) => update.mutate({ id: tripId, summary })}
                  className="min-h-24 w-full resize-y rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-ring"
                  ariaLabel="About this trip"
                />
              ) : trip.summary ? (
                <p className="text-sm leading-6 text-muted-foreground">{trip.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
              {owner ? <ProjectLink tripId={tripId} projectId={trip.projectId} onChange={(projectId) => update.mutate({ id: tripId, projectId })} /> : null}
            </section>
          </div>
        </aside>
      </div>
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

function RouteStatus({
  routing,
  trip,
  pending,
  onRetry,
}: {
  routing: boolean;
  trip: { stops: unknown[]; route: unknown; routeError: string | null };
  pending: boolean;
  onRetry: () => void;
}) {
  if (trip.stops.length < 2 || pending || trip.route) return null;
  if (!routing) {
    return (
      <p className="rounded-2xl bg-accent/60 px-4 py-3 text-xs leading-5 text-accent-foreground">
        Road routing isn&apos;t switched on here yet, so legs are shown as straight lines with distances as the crow flies.
      </p>
    );
  }
  if (trip.routeError) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-xs leading-5 text-destructive">
        <span>{trip.routeError}</span>
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline-offset-2 hover:underline">
          Retry
        </button>
      </div>
    );
  }
  return null;
}

function LegConnector({
  leg,
  accent,
  mode: ModeIcon,
  dayBreak,
}: {
  leg: { distance: number; duration: number | null; exact: boolean };
  accent: string;
  mode: LucideIcon;
  dayBreak: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-1.5 pl-[1.15rem]", dayBreak && "pb-0")}>
      <span className="h-8 w-0.5 rounded-full" style={{ background: leg.exact ? accent : `repeating-linear-gradient(${accent} 0 3px, transparent 3px 7px)` }} />
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ModeIcon className="size-3.5" />
        {leg.exact ? `${formatDistance(leg.distance)} · ${formatDuration(leg.duration)}` : `~${formatDistance(leg.distance)} in a straight line`}
      </span>
    </div>
  );
}

type Stop = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: StopKindKey;
  day: number;
  stayMinutes: number;
  notes: string;
};

function StopRow({
  stop,
  index,
  total,
  accent,
  owner,
  selected,
  maxDay,
  onSelect,
  onUpdate,
  onRemove,
  onMove,
  onDrop,
}: {
  stop: Stop;
  index: number;
  total: number;
  accent: string;
  owner: boolean;
  selected: boolean;
  maxDay: number;
  onSelect: () => void;
  onUpdate: (fields: Partial<Pick<Stop, "name" | "notes" | "kind" | "day" | "stayMinutes">>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onDrop: (draggedId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const KindIcon = KIND_ICONS[stop.kind];
  const end = index === 0 || index === total - 1;
  return (
    <div
      draggable={owner}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", stop.id);
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
        if (id && id !== stop.id) onDrop(id);
      }}
      className={cn(
        "rounded-2xl border bg-card transition-[box-shadow,border-color]",
        selected ? "border-transparent shadow-lift ring-2" : "border-border hover:border-foreground/20",
        dragOver && "ring-2 ring-primary/40",
      )}
      style={selected ? ({ "--tw-ring-color": accent } as React.CSSProperties) : undefined}
    >
      <button type="button" onClick={onSelect} aria-expanded={selected} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-bold"
          style={{ borderColor: accent, background: end ? accent : "transparent", color: end ? "white" : accent }}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{stop.name}</span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <KindIcon className="size-3.5 shrink-0" />
            {STOP_KIND_INFO[stop.kind].label}
            {stop.stayMinutes ? ` · ${stayLabel(stop.stayMinutes)}` : ""}
            {stop.notes ? " · Notes" : ""}
          </span>
        </span>
        {owner ? <GripVerticalIcon className="hidden size-4 shrink-0 cursor-grab text-muted-foreground/60 sm:block" aria-hidden /> : null}
      </button>

      {selected ? (
        <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
          {stop.address && stop.address !== stop.name ? <p className="text-xs text-muted-foreground">{stop.address}</p> : null}
          {owner ? (
            <>
              <EditableText value={stop.name} onSave={(name) => name && onUpdate({ name })} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-ring" ariaLabel="Stop name" />
              <div className="grid grid-cols-3 gap-2">
                <Select label="Type" value={stop.kind} onChange={(kind) => onUpdate({ kind: kind as StopKindKey })} options={(Object.keys(STOP_KIND_INFO) as StopKindKey[]).map((k) => [k, STOP_KIND_INFO[k].label])} />
                <Select
                  label="Day"
                  value={String(stop.day)}
                  onChange={(day) => onUpdate({ day: Number(day) })}
                  options={Array.from({ length: Math.min(60, maxDay + 1) }, (_, i) => [String(i + 1), i + 1 > maxDay ? `Day ${i + 1} (new)` : `Day ${i + 1}`])}
                />
                <Select label="Stay" value={String(stop.stayMinutes)} onChange={(m) => onUpdate({ stayMinutes: Number(m) })} options={STAY_OPTIONS.map((m) => [String(m), stayLabel(m)])} />
              </div>
              <EditableText
                multiline
                value={stop.notes}
                placeholder="Notes: who you're meeting, what to bring, where to park…"
                onSave={(notes) => onUpdate({ notes })}
                className="min-h-20 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                ariaLabel="Stop notes"
              />
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
                  <Trash2Icon className="size-4" /> Remove
                </Button>
              </div>
            </>
          ) : stop.notes ? (
            <p className="whitespace-pre-line text-sm leading-6">{stop.notes}</p>
          ) : null}
          <a
            href={`https://www.openstreetmap.org/?mlat=${stop.lat}&mlon=${stop.lng}#map=15/${stop.lat}/${stop.lng}`}
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-2.5 text-sm outline-none focus:border-ring">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
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

type Place = { id: string; name: string; label: string; lat: number; lng: number };

/** Place search backed by ORS autocomplete (through our API). Debounced and keyboard friendly. */
function PlaceSearch({
  routing,
  near,
  disabled,
  onPick,
}: {
  routing: boolean;
  near?: { lat: number; lng: number };
  disabled?: boolean;
  onPick: (place: Place) => void;
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
  const places = results.data ?? [];
  const pick = (place: Place) => {
    onPick(place);
    setText("");
    setDebounced("");
    setOpen(false);
  };

  if (!routing) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        <SearchIcon className="size-4 shrink-0" /> Place search needs routing to be switched on. You can still add stops on the map.
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
          if (!places.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % places.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + places.length) % places.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(places[active]!);
          }
        }}
        placeholder="Add a stop: search a town, landmark, or address"
        aria-label="Search for a place to add"
        role="combobox"
        aria-expanded={open && places.length > 0}
        className="h-11 pl-10"
      />
      {open && debounced.length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-lift" role="listbox">
          {results.isFetching && !places.length ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Searching…
            </p>
          ) : places.length ? (
            places.map((place, i) => (
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
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Who can see this trip</DropdownMenuLabel>
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

function TripMenu({
  owner,
  trip,
  onDuplicate,
  onDelete,
  onAccent,
}: {
  owner: boolean;
  trip: { title: string; stops: Stop[]; route: { geometry: Array<[number, number]> } | null; accentColor: string };
  onDuplicate: () => void;
  onDelete: () => void;
  onAccent: (color: string) => void;
}) {
  const downloadGpx = () => {
    const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
    const wpts = trip.stops.map((s) => `  <wpt lat="${s.lat}" lon="${s.lng}"><name>${esc(s.name)}</name></wpt>`).join("\n");
    const track = (trip.route?.geometry ?? trip.stops.map((s) => [s.lng, s.lat] as [number, number]))
      .map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}"/>`)
      .join("\n");
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="skaddosh" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${esc(trip.title)}</name></metadata>\n${wpts}\n  <trk><name>${esc(trip.title)}</name><trkseg>\n${track}\n  </trkseg></trk>\n</gpx>\n`;
    const url = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/[^\w-]+/g, "-").toLowerCase() || "trip"}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const osmDirections =
    trip.stops.length >= 2
      ? `https://www.openstreetmap.org/directions?route=${trip.stops
          .slice(0, 2)
          .map((s) => `${s.lat}%2C${s.lng}`)
          .join("%3B")}`
      : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-9" aria-label="More trip actions">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(window.location.href)}>
          <LinkIcon /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={downloadGpx} disabled={!trip.stops.length}>
          <DownloadIcon /> Download GPX
        </DropdownMenuItem>
        {osmDirections ? (
          <DropdownMenuItem asChild>
            <a href={osmDirections} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon /> First leg in OpenStreetMap
            </a>
          </DropdownMenuItem>
        ) : null}
        {owner ? (
          <>
            <DropdownMenuItem onSelect={onDuplicate}>
              <CopyIcon /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Route colour</DropdownMenuLabel>
            <div className="flex gap-1.5 px-2 pb-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use ${c}`}
                  onClick={() => onAccent(c)}
                  className={cn("size-6 rounded-full ring-offset-2 ring-offset-popover", trip.accentColor === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2Icon /> Delete trip
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Link the trip to one of your projects, so it shows on the project page. */
function ProjectLink({ tripId, projectId, onChange }: { tripId: string; projectId: string | null; onChange: (projectId: string | null) => void }) {
  const projects = trpc.projects.mine.useQuery();
  if (!projects.data?.length) return null;
  return (
    <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-2.5 text-sm" htmlFor={`project-${tripId}`}>
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
