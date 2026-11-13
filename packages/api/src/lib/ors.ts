/**
 * OpenRouteService client (server-only). The key stays on the server, as HeiGIT's terms require:
 * browsers and the app call our tRPC API, which calls ORS. Response shapes follow the ORS API
 * reference (directions GeoJSON, Pelias geocoder, VROOM optimization); see docs/TRIPS.md.
 */
import { TRPCError } from "@trpc/server";
import type { Leg } from "./trip-planning";

const DEFAULT_BASE_URL = "https://api.openrouteservice.org";
const TIMEOUT_MS = 15_000;
/** Snap each waypoint to the nearest road within this many metres (ORS default is 350 m). */
const SNAP_RADIUS_M = 5_000;

export function orsConfig(): { enabled: true; baseUrl: string; key: string } | { enabled: false } {
  const key = process.env.ORS_API_KEY?.trim();
  if (!key) return { enabled: false };
  return { enabled: true, key, baseUrl: (process.env.ORS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "") };
}

export type Place = {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  layer: string | null;
  country: string | null;
};

export type DirectionsResult = {
  geometry: Array<[number, number]>;
  distance: number;
  duration: number;
  legs: Leg[];
};

// ── Response parsing (pure, unit-tested) ──────────────────────────────────────

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Parse a `POST /v2/directions/{profile}/geojson` response. Returns null when it has no usable route. */
export function parseDirections(body: unknown): DirectionsResult | null {
  const feature = (body as { features?: unknown[] } | null)?.features?.[0] as
    | { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }
    | undefined;
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "LineString" || !Array.isArray(coordinates)) return null;
  const geometry: Array<[number, number]> = [];
  for (const c of coordinates) {
    if (!Array.isArray(c)) continue;
    const lng = num(c[0]);
    const lat = num(c[1]);
    if (lng !== null && lat !== null) geometry.push([Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
  }
  if (geometry.length < 2) return null;
  const props = feature.properties ?? {};
  const summary = (props.summary ?? {}) as Record<string, unknown>;
  const segments = Array.isArray(props.segments) ? (props.segments as Array<Record<string, unknown>>) : [];
  const legs = segments.map((s) => ({ distance: num(s.distance) ?? 0, duration: num(s.duration) ?? 0 }));
  // ORS omits zero values from the summary (e.g. two stops at the same spot).
  const distance = num(summary.distance) ?? legs.reduce((t, l) => t + l.distance, 0);
  const duration = num(summary.duration) ?? legs.reduce((t, l) => t + l.duration, 0);
  return { geometry, distance, duration, legs };
}

/** Parse a Pelias geocoder response (`/geocode/autocomplete`, `/geocode/search`, `/geocode/reverse`). */
export function parsePlaces(body: unknown): Place[] {
  const features = (body as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  const places: Place[] = [];
  for (const f of features as Array<{ geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }>) {
    const c = f.geometry?.coordinates;
    if (!Array.isArray(c)) continue;
    const lng = num(c[0]);
    const lat = num(c[1]);
    if (lng === null || lat === null) continue;
    const p = f.properties ?? {};
    const name = typeof p.name === "string" && p.name ? p.name : typeof p.label === "string" ? p.label.split(",")[0]! : "";
    if (!name) continue;
    places.push({
      id: typeof p.gid === "string" ? p.gid : typeof p.id === "string" ? p.id : `${lat},${lng}`,
      name,
      label: typeof p.label === "string" ? p.label : name,
      lat,
      lng,
      layer: typeof p.layer === "string" ? p.layer : null,
      country: typeof p.country === "string" ? p.country : null,
    });
  }
  return places;
}

/**
 * Parse a VROOM `/optimization` response into the visiting order of job ids. VROOM steps carry the
 * job id as `id` (current) or `job` (older releases). Returns null if any job was left unassigned.
 */
export function parseOptimizationOrder(body: unknown, jobCount: number): number[] | null {
  const b = body as { routes?: Array<{ steps?: Array<Record<string, unknown>> }>; unassigned?: unknown[] } | null;
  if (Array.isArray(b?.unassigned) && b.unassigned.length > 0) return null;
  const steps = b?.routes?.[0]?.steps;
  if (!Array.isArray(steps)) return null;
  const order = steps
    .filter((s) => s.type === "job")
    .map((s) => num(s.job) ?? num(s.id))
    .filter((id): id is number => id !== null);
  if (order.length !== jobCount || new Set(order).size !== jobCount) return null;
  return order;
}

/** Turn an ORS failure into a sentence a traveller can act on. */
export function orsErrorMessage(status: number, body: unknown): string {
  const error = (body as { error?: unknown } | null)?.error;
  const code = typeof error === "object" && error ? num((error as { code?: unknown }).code) : null;
  if (status === 429) return "The routing service is busy. Try again in a minute.";
  if (status === 401 || status === 403) return "Routing isn't available right now.";
  switch (code) {
    case 2004:
      return "This route is longer than the routing service allows. Split it into shorter trips.";
    case 2009:
      return "There's no route between some of these stops with this way of travelling.";
    case 2010:
      return "One of the stops is too far from any road or path. Move it closer to one.";
    default:
      return "Couldn't work out a route. Try again, or move a stop.";
  }
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

async function orsRequest(path: string, init: { method: "GET" | "POST"; query?: Record<string, string>; body?: unknown }) {
  const config = orsConfig();
  if (!config.enabled) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Routing isn't set up on this skaddosh yet." });
  }
  const url = new URL(config.baseUrl + path);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: config.key,
        Accept: "application/json, application/geo+json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[skaddosh] ORS request failed", path, error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The routing service didn't answer. Try again in a moment." });
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.warn("[skaddosh] ORS error", path, response.status, JSON.stringify(body)?.slice(0, 300));
    throw new TRPCError({
      code: response.status === 429 ? "TOO_MANY_REQUESTS" : response.status >= 500 || response.status === 401 || response.status === 403 ? "BAD_GATEWAY" : "BAD_REQUEST",
      message: orsErrorMessage(response.status, body),
    });
  }
  return body;
}

/** Route through `stops` ([lng, lat] each) with an ORS profile. */
export async function directions(profile: string, coordinates: Array<[number, number]>): Promise<DirectionsResult> {
  const body = await orsRequest(`/v2/directions/${encodeURIComponent(profile)}/geojson`, {
    method: "POST",
    body: {
      coordinates,
      instructions: false,
      geometry_simplify: true,
      radiuses: coordinates.map(() => SNAP_RADIUS_M),
    },
  });
  const parsed = parseDirections(body);
  if (!parsed) throw new TRPCError({ code: "BAD_GATEWAY", message: "The routing service returned no route." });
  return parsed;
}

/** Type-ahead place search, biased toward `focus` when given. */
export async function autocomplete(text: string, focus?: { lat: number; lng: number }): Promise<Place[]> {
  const query: Record<string, string> = { text, size: "6" };
  if (focus) {
    query["focus.point.lat"] = focus.lat.toFixed(4);
    query["focus.point.lon"] = focus.lng.toFixed(4);
  }
  return parsePlaces(await orsRequest("/geocode/autocomplete", { method: "GET", query }));
}

/** The nearest named place to a point, for stops dropped on the map. */
export async function reverseGeocode(lat: number, lng: number): Promise<Place | null> {
  const body = await orsRequest("/geocode/reverse", {
    method: "GET",
    query: { "point.lat": lat.toFixed(6), "point.lon": lng.toFixed(6), size: "1" },
  });
  return parsePlaces(body)[0] ?? null;
}

/**
 * Best visiting order for the middle stops, keeping the first and last fixed. Returns the indexes
 * of `middle` in visiting order.
 */
export async function optimizeOrder(
  profile: string,
  start: [number, number],
  middle: Array<[number, number]>,
  end: [number, number],
): Promise<number[]> {
  const body = await orsRequest("/optimization", {
    method: "POST",
    body: {
      jobs: middle.map((location, id) => ({ id, location })),
      vehicles: [{ id: 1, profile, start, end }],
    },
  });
  const order = parseOptimizationOrder(body, middle.length);
  if (!order) throw new TRPCError({ code: "BAD_GATEWAY", message: "Couldn't find a better order for these stops." });
  return order;
}
