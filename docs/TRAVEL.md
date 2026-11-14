# Travel collections

A travel collection is a gallery item for work that happens on the road: a sketchbook ride, a field
recording walk, the research trip behind a book. It's a set of **places in the order they
happened**, each with **photos and a story**, shown on a map with the journey drawn between them.

It isn't an itinerary planner. There are no days, stay times, schedules, or route optimisation. Kudos
work as they do everywhere else, and a collection linked to a project points supporters at that
project.

The map is drawn with [Leaflet](https://leafletjs.com) over OpenStreetMap tiles. Place search and
the journey line come from [OpenRouteService](https://openrouteservice.org) (ORS), run by HeiGIT.

## What people can do

| | |
| --- | --- |
| **Make** | Start a collection from Create → Travel collection, `/travel`, or a project page. Add places by searching or pinning them on the map. Drag pins to move them, and reorder places by dragging or with the arrows. |
| **Tell it** | Give each place up to 12 photos with captions and a story. Pick any photo as the collection cover, or the first photo is used. Add a summary, a month and year, and how you travelled. |
| **Browse** | The collection page puts the places beside a full map on desktop, and the map above them on phones. Photo pins show each place's first photo. Photos open in a lightbox that steps through the whole collection. |
| **Share** | Collections are **private** by default. **Link only** lets anyone with the link see it. **Public** shows it in the gallery (the Explore strip and `/travel`) and on your profile's Travel tab. Signed-in people can save a copy of a public collection. |
| **Connect** | Link a collection to one of your projects, and the project page shows it under "Places behind this work". |

In the Expo app, the Travel tab shows collections with their cover photos and places. Adding places
and photos opens the web editor.

## How it works

```
browser / app ──tRPC──▶ packages/api trips router ──HTTPS + Authorization──▶ api.openrouteservice.org
                              │
                              └── Postgres: trip (collection), trip_stop (place, with photos)
```

The tables and router keep their original names (`trip`, `trip_stop`, `trips.*`) from when this
was a trip planner. In the product, they're travel collections and places.

- **The key never leaves the server.** HeiGIT's terms say an API key belongs to one person and must
  not be used in client-side code. All ORS calls go through `packages/api/src/lib/ors.ts`, which
  sends the key in the `Authorization` header.
- **The journey line is cached.** `trip.route_key` hashes the travel mode and the rounded coordinates
  of the places, in order. `trips.route` calls ORS only when that key changes. Editing names,
  stories, or photos keeps the cached line. Moving, adding, removing, or reordering places, or
  changing the mode, makes it stale. Copying a collection copies its cached line.
- **It degrades to straight lines.** If ORS can't trace a road between the current places (for
  example, across water), the error is remembered for those places and the journey is drawn as
  straight lines. With no `ORS_API_KEY`, place search is off, places are pinned on the map, and the
  journey is always straight lines.
- **Photos** are uploaded through the existing image upload route (`/api/uploads/images`, folder
  `travel`) to the configured S3-compatible storage. Each place stores `{ url, caption }[]` in
  `trip_stop.photos`.

### OpenRouteService endpoints used

| Purpose | Endpoint |
| --- | --- |
| Journey line | `POST /v2/directions/{profile}/geojson` with `coordinates` (`[lon, lat]`), `instructions: false`, `geometry_simplify: true`, and `radiuses` of 5 km so places snap to the nearest road |
| Place search | `GET /geocode/autocomplete?text=…&size=6` with `focus.point.lat/lon` near the collection |
| Pin names | `GET /geocode/reverse?point.lat=…&point.lon=…&size=1` (a name is used only when the place is within 2 km) |

Travel modes offered: `driving-car`, `cycling-regular`, `cycling-electric`, `cycling-mountain`,
`foot-walking`, `foot-hiking`, `wheelchair`.

### Limits

| Limit | Value | Where |
| --- | --- | --- |
| Places per collection | 50 (the ORS waypoint limit) | `TRIP_LIMITS.MAX_STOPS` |
| Photos per place | 12 | `TRIP_LIMITS.MAX_PHOTOS_PER_PLACE` |
| Journey length | 6,000 km, or 300 km for wheelchair, checked against the straight-line distance before calling ORS ([hosted ORS restrictions](https://giscience.github.io/openrouteservice/hosted-api-restrictions)) | `TRAVEL_MODE_INFO[mode].maxKm` |
| Journey requests | 20 per minute per person | `trips.route` |
| Place searches | 60 per minute per person | `trips.search`, `trips.reverse` |
| Collections per person | 200 | `trips.create` |

The rate limits are per web instance and protect the shared ORS quota.

## Configuration

| Variable | Meaning |
| --- | --- |
| `ORS_API_KEY` | Server-only HeiGIT key from [account.heigit.org](https://account.heigit.org). If empty, place search is off and journeys are drawn as straight lines. |
| `ORS_BASE_URL` | Optional. Point at a self-hosted ORS instance. It defaults to `https://api.openrouteservice.org`. The geocoder only exists on the hosted API. |
| `NEXT_PUBLIC_MAP_TILE_URL` | Optional tile URL template. It defaults to the OpenStreetMap standard layer, whose [usage policy](https://operations.osmfoundation.org/policies/tiles/) suits light traffic only. Use a tile provider for production volumes. |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Optional attribution HTML for your tile provider. |

The map always credits OpenStreetMap contributors and openrouteservice by HeiGIT. The site footer
repeats the credit.

## Data and privacy

- `trip` holds the title, summary, travel mode, visibility, colour, cover image, month, optional
  project link, and the cached journey line. `trip_stop` holds each place's name, address,
  coordinates, story (`notes`), and photos.
- Private collections are visible only to their owner. Viewers of public and link-only collections
  see everything in them, including stories and photo captions. Photos can carry location and
  personal details, so the visibility menu says plainly who can see a collection.
- Place coordinates, search text, and dropped pins are sent to ORS. No account details are sent.
- Collections and places are deleted with the account (`ON DELETE CASCADE`). If a linked project is
  deleted, the collection stays and the link is cleared.

## History

This started as a trip planner (migration `0003_trips`), with days, stay times, place types,
best-order optimisation, and GPX export. It was reshaped into travel collections because skaddosh
is a gallery, not an itinerary app. Migration `0004_travel_collections` added photos and covers, and
`0005_drop_itinerary_fields` removed the planner-only columns. `/trips` URLs redirect to `/travel`.

## Code map

| File | Role |
| --- | --- |
| `packages/db/src/schema.ts` (`trip`, `trip_stop`), `drizzle/0003`–`0005`, `src/seed-trips.ts` | Schema, migrations, three demo collections (places and stories, no seeded photos) |
| `packages/api/src/lib/ors.ts` | ORS client and response parsers |
| `packages/api/src/lib/trip-planning.ts` | Pure helpers shared with clients as `@skaddosh/api/trips`: modes, limits, distances, the journey key, formatting |
| `packages/api/src/routers/trips.ts` | `config`, `mine`, `explore`, `byOwner`, `forProject`, `byId`, `create`, `update`, `delete`, `duplicate`, `addStop`, `updateStop`, `removeStop`, `reorder`, `route`, `search`, `reverse` |
| `packages/api/src/lib/trips.test.ts` | Unit tests for the helpers, parsers (using the documented response shapes), error messages, and rate limiting |
| `apps/web/src/components/travel/*` | Collection page, cards, the Explore strip, the Leaflet map with photo pins, the SVG journey preview |
| `apps/web/src/app/travel/*` | `/travel` and `/travel/:id` |
| `apps/mobile/src/screens/TravelScreen.tsx`, `TripScreen.tsx` | The app's Travel tab and collection view |
