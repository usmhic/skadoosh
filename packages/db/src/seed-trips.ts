/**
 * Demo trips. Stops are real places. Routes are not seeded: they come from OpenRouteService the
 * first time a trip is opened with ORS_API_KEY set. Until then the planner shows straight-line legs.
 * Idempotent: fixed ids, conflict-skips.
 */
import { db, trip, tripStop, type StopKind, type TravelMode } from "./index";

type DemoStop = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  day: number;
  kind?: StopKind;
  stayMinutes?: number;
  notes?: string;
};

type DemoTrip = {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  summary: string;
  mode: TravelMode;
  accentColor: string;
  startInDays: number;
  stops: DemoStop[];
};

const DEMO_TRIPS: DemoTrip[] = [
  {
    id: "trip_salt_roads",
    ownerId: "user_laila_mansouri",
    projectId: "proj_salt_atlas",
    title: "Salt roads: Marrakech to Zagora",
    summary: "Field trip for Salt Atlas, recording the families who still remember the caravan stops.",
    mode: "driving-car",
    accentColor: "#e8573f",
    startInDays: 12,
    stops: [
      { name: "Marrakech", address: "Marrakech, Morocco", lat: 31.6295, lng: -7.9811, day: 1, kind: "stay", notes: "Pick up the recorder and spare batteries in the medina." },
      { name: "Tizi n'Tichka", address: "Tizi n'Tichka pass, Morocco", lat: 31.2853, lng: -7.3817, day: 1, kind: "sight", stayMinutes: 30 },
      { name: "Aït Benhaddou", address: "Aït Benhaddou, Morocco", lat: 31.047, lng: -7.1319, day: 1, kind: "sight", stayMinutes: 120, notes: "Interview with the ksar's keeper at 16:00." },
      { name: "Ouarzazate", address: "Ouarzazate, Morocco", lat: 30.9189, lng: -6.8934, day: 2, kind: "stay" },
      { name: "Agdz", address: "Agdz, Morocco", lat: 30.6979, lng: -6.4497, day: 2, kind: "food", stayMinutes: 60 },
      { name: "Zagora", address: "Zagora, Morocco", lat: 30.3324, lng: -5.8384, day: 3, kind: "stay", notes: "Last stop before the old route turns south to Tombouctou." },
    ],
  },
  {
    id: "trip_coast_ride",
    ownerId: "user_mina_park",
    title: "Coastal sketch ride: Lisbon to Porto",
    summary: "Five days on the bike with a sketchbook. Each stop is a page.",
    mode: "cycling-regular",
    accentColor: "#3a74ad",
    startInDays: 30,
    stops: [
      { name: "Lisbon", address: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393, day: 1, kind: "stay" },
      { name: "Ericeira", address: "Ericeira, Portugal", lat: 38.9631, lng: -9.4155, day: 1, kind: "sight", stayMinutes: 90 },
      { name: "Peniche", address: "Peniche, Portugal", lat: 39.3558, lng: -9.3811, day: 2, kind: "stay" },
      { name: "Nazaré", address: "Nazaré, Portugal", lat: 39.6021, lng: -9.071, day: 3, kind: "sight", stayMinutes: 120, notes: "Big-wave lookout at the lighthouse." },
      { name: "Aveiro", address: "Aveiro, Portugal", lat: 40.6405, lng: -8.6538, day: 4, kind: "stay" },
      { name: "Porto", address: "Porto, Portugal", lat: 41.1579, lng: -8.6291, day: 5, kind: "stay" },
    ],
  },
  {
    id: "trip_kyoto_walk",
    ownerId: "user_hana_sato",
    title: "Kyoto sound walk",
    summary: "A morning of field recordings, from the shrine gates to the market.",
    mode: "foot-walking",
    accentColor: "#2f8a5f",
    startInDays: 45,
    stops: [
      { name: "Kyoto Station", address: "Kyoto Station, Kyoto, Japan", lat: 34.9858, lng: 135.7588, day: 1, kind: "transport" },
      { name: "Fushimi Inari", address: "Fushimi Inari Taisha, Kyoto, Japan", lat: 34.9671, lng: 135.7727, day: 1, kind: "sight", stayMinutes: 90, notes: "Record the gates at dawn, before the crowds." },
      { name: "Kiyomizu-dera", address: "Kiyomizu-dera, Kyoto, Japan", lat: 34.9949, lng: 135.785, day: 1, kind: "sight", stayMinutes: 60 },
      { name: "Gion", address: "Gion, Kyoto, Japan", lat: 35.0037, lng: 135.7788, day: 1, kind: "food", stayMinutes: 45 },
      { name: "Nishiki Market", address: "Nishiki Market, Kyoto, Japan", lat: 35.005, lng: 135.7649, day: 1, kind: "food", stayMinutes: 60 },
    ],
  },
];

export const DEMO_TRIP_COUNT = DEMO_TRIPS.length;

export async function insertDemoTrips() {
  const now = Date.now();
  for (const t of DEMO_TRIPS) {
    const startDate = new Date(now + t.startInDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const inserted = await db
      .insert(trip)
      .values({
        id: t.id,
        ownerId: t.ownerId,
        projectId: t.projectId ?? null,
        title: t.title,
        summary: t.summary,
        mode: t.mode,
        visibility: "public",
        accentColor: t.accentColor,
        startDate,
      })
      .onConflictDoNothing()
      .returning({ id: trip.id });
    if (!inserted.length) continue;
    await db.insert(tripStop).values(
      t.stops.map((s, position) => ({
        id: `${t.id}_${position}`,
        tripId: t.id,
        position,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        day: s.day,
        kind: s.kind ?? "place",
        stayMinutes: s.stayMinutes ?? 0,
        notes: s.notes ?? "",
      })),
    );
  }
}
