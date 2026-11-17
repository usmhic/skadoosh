/**
 * Demo travel collections. Places are real. Photos aren't seeded (there are no demo photo assets),
 * so these collections show their journey line and stories until their owners add photos.
 * Journey lines come from OpenRouteService when ORS_API_KEY is set. Idempotent: fixed ids.
 */
import { db, trip, tripStop, type TravelMode } from "./index";

type DemoPlace = { name: string; address: string; lat: number; lng: number; story?: string };
type DemoCollection = {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  summary: string;
  mode: TravelMode;
  accentColor: string;
  monthsAgo: number;
  places: DemoPlace[];
};

const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    id: "trip_salt_roads",
    ownerId: "user_laila_mansouri",
    projectId: "proj_salt_atlas",
    title: "Salt roads: Marrakech to Zagora",
    summary: "The field recordings and sketches behind Salt Atlas, place by place along the old caravan route.",
    mode: "driving-car",
    accentColor: "#e8573f",
    monthsAgo: 2,
    places: [
      { name: "Marrakech", address: "Marrakech, Morocco", lat: 31.6295, lng: -7.9811, story: "Where the salt caravans used to unload. The spice sellers still weigh it by hand." },
      { name: "Tizi n'Tichka", address: "Tizi n'Tichka pass, Morocco", lat: 31.2853, lng: -7.3817, story: "The pass the caravans crossed in spring. First sketch for plate 3." },
      { name: "Aït Benhaddou", address: "Aït Benhaddou, Morocco", lat: 31.047, lng: -7.1319, story: "The ksar's keeper told the story of the last caravan he saw as a boy." },
      { name: "Ouarzazate", address: "Ouarzazate, Morocco", lat: 30.9189, lng: -6.8934 },
      { name: "Agdz", address: "Agdz, Morocco", lat: 30.6979, lng: -6.4497, story: "Palm groves and a market where salt slabs are still sold." },
      { name: "Zagora", address: "Zagora, Morocco", lat: 30.3324, lng: -5.8384, story: "The famous sign: Tombouctou, 52 days by camel." },
    ],
  },
  {
    id: "trip_coast_ride",
    ownerId: "user_mina_park",
    title: "Coastal sketchbook: Lisbon to Porto",
    summary: "Five days on the bike with a sketchbook. Each place is a page.",
    mode: "cycling-regular",
    accentColor: "#3a74ad",
    monthsAgo: 5,
    places: [
      { name: "Lisbon", address: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393, story: "Tram 28 in pencil, before the rain." },
      { name: "Ericeira", address: "Ericeira, Portugal", lat: 38.9631, lng: -9.4155 },
      { name: "Peniche", address: "Peniche, Portugal", lat: 39.3558, lng: -9.3811, story: "Fishing boats at dawn, in ink and wash." },
      { name: "Nazaré", address: "Nazaré, Portugal", lat: 39.6021, lng: -9.071, story: "The lighthouse above the big waves. Three attempts, kept the third." },
      { name: "Aveiro", address: "Aveiro, Portugal", lat: 40.6405, lng: -8.6538 },
      { name: "Porto", address: "Porto, Portugal", lat: 41.1579, lng: -8.6291, story: "The Dom Luís bridge from the Gaia side, last page of the book." },
    ],
  },
  {
    id: "trip_kyoto_walk",
    ownerId: "user_hana_sato",
    title: "Kyoto sound walk",
    summary: "A morning of field recordings, from the shrine gates to the market.",
    mode: "foot-walking",
    accentColor: "#2f8a5f",
    monthsAgo: 8,
    places: [
      { name: "Kyoto Station", address: "Kyoto Station, Kyoto, Japan", lat: 34.9858, lng: 135.7588 },
      { name: "Fushimi Inari", address: "Fushimi Inari Taisha, Kyoto, Japan", lat: 34.9671, lng: 135.7727, story: "Wind through ten thousand gates, recorded at dawn." },
      { name: "Kiyomizu-dera", address: "Kiyomizu-dera, Kyoto, Japan", lat: 34.9949, lng: 135.785, story: "The waterfall below the temple, three streams falling into stone." },
      { name: "Gion", address: "Gion, Kyoto, Japan", lat: 35.0037, lng: 135.7788 },
      { name: "Nishiki Market", address: "Nishiki Market, Kyoto, Japan", lat: 35.005, lng: 135.7649, story: "Knife sharpeners and fryers. The loudest track on the album." },
    ],
  },
];

export const DEMO_TRIP_COUNT = DEMO_COLLECTIONS.length;

export async function insertDemoTrips() {
  for (const c of DEMO_COLLECTIONS) {
    const when = new Date();
    when.setMonth(when.getMonth() - c.monthsAgo, 1);
    const inserted = await db
      .insert(trip)
      .values({
        id: c.id,
        ownerId: c.ownerId,
        projectId: c.projectId ?? null,
        title: c.title,
        summary: c.summary,
        mode: c.mode,
        visibility: "public",
        accentColor: c.accentColor,
        startDate: when.toISOString().slice(0, 10),
      })
      .onConflictDoNothing()
      .returning({ id: trip.id });
    if (!inserted.length) continue;
    await db.insert(tripStop).values(
      c.places.map((p, position) => ({
        id: `${c.id}_${position}`,
        tripId: c.id,
        position,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        notes: p.story ?? "",
      })),
    );
  }
}
