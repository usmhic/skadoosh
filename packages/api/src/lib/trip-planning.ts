/**
 * Pure helpers for travel collections, shared by the API and clients (`@skaddosh/api/trips`).
 * No I/O. Limits mirror the hosted OpenRouteService restrictions (docs/TRAVEL.md).
 */

export const TRAVEL_MODE_INFO = {
  "driving-car": { label: "Drive", verb: "drive", maxKm: 6000 },
  "cycling-regular": { label: "Cycle", verb: "ride", maxKm: 6000 },
  "cycling-electric": { label: "E-bike", verb: "ride", maxKm: 6000 },
  "cycling-mountain": { label: "Mountain bike", verb: "ride", maxKm: 6000 },
  "foot-walking": { label: "Walk", verb: "walk", maxKm: 6000 },
  "foot-hiking": { label: "Hike", verb: "hike", maxKm: 6000 },
  wheelchair: { label: "Wheelchair", verb: "go", maxKm: 300 },
} as const;
export type TravelModeKey = keyof typeof TRAVEL_MODE_INFO;

export const TRIP_LIMITS = {
  /** ORS directions accept at most 50 waypoints per request. */
  MAX_STOPS: 50,
  MAX_PHOTOS_PER_PLACE: 12,
} as const;

export type LatLng = { lat: number; lng: number };
export type Leg = { distance: number; duration: number };

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line distance of the whole stop sequence, used before a route exists. */
export function straightLineMeters(stops: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) total += haversineMeters(stops[i - 1]!, stops[i]!);
  return total;
}

/**
 * Identifies the input a route was computed for. A cached route is current only while the trip's
 * mode and the rounded coordinates of its stops, in order, still produce the same key.
 */
export function routeKey(mode: string, stops: LatLng[]): string {
  const input = `${mode}|${stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join(";")}`;
  // FNV-1a, two seeds: deterministic, dependency-free, and plenty for cache invalidation.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}:${stops.length}`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "–";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString("en")} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  // Past ten hours, minutes are noise: "73 h" reads better than "73 h 25 min".
  if (h >= 10) return `${Math.round(minutes / 60)} h`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The bounding box of a set of points, padded so markers never sit on the map's edge. */
export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return [
    [south, west],
    [north, east],
  ];
}

/** Reorder `items` to match `orderedIds`. Ids that aren't present are ignored and missing items keep their relative order at the end. */
export function applyOrder<T extends { id: string }>(items: T[], orderedIds: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
  const placed = new Set(ordered.map((item) => item.id));
  return [...ordered, ...items.filter((item) => !placed.has(item.id))];
}
