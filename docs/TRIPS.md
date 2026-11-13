# Trips

Trips let creators plan the journeys behind their work, such as a field trip for research, a tour, a
recording walk, or a sketching ride. You search for places or drop pins on a map, get real routes
with distances and travel times, organise stops into days, and share the plan or link it to a
project.

Routing and place search come from [OpenRouteService](https://openrouteservice.org) (ORS), run by
HeiGIT. The map is drawn with [Leaflet](https://leafletjs.com) over OpenStreetMap tiles.

## What people can do

| | |
| --- | --- |
| **Plan** | Create a trip, choose how you'll travel, and add stops by searching or tapping the map. Drag pins or reorder stops by dragging or with the arrows. |
| **Organise** | Put stops on days, set how long you'll stay, mark the type (stay, food, sight, transport, place), and add notes. Each day shows its travel distance, travel time, and time spent at stops. |
| **Route** | Get the road or path route for driving, cycling (regular, e-bike, mountain), walking, hiking, or wheelchair. Each leg shows distance and time. **Best order** keeps your first and last stop and visits the rest in the shortest order. |
| **Share** | Trips are **private** by default. **Link only** lets anyone with the link view the trip. **Public** also lists it on `/trips`. Anyone signed in can **copy** a public trip to adapt it. |
| **Connect** | Link a trip to one of your projects, and the project page shows it under "The journey". |
| **Take it with you** | Download a GPX file, or open a stop in OpenStreetMap. |

Mobile web gets the full planner, with the map on top and the plan below. The Expo app shows trips
and their plans, and opens the web planner to edit.

## How it works

```
browser / app ──tRPC──▶ packages/api trips router ──HTTPS + Authorization──▶ api.openrouteservice.org
                              │
                              └── Postgres: trip, trip_stop (route cached on trip)
```

- **The key never leaves the server.** HeiGIT's terms say an API key belongs to one person and must
  not be used in client-side code. All ORS calls go through `packages/api/src/lib/ors.ts`, which
  sends the key in the `Authorization` header.
- **Routes are cached.** `trip.route_key` hashes the travel mode and the rounded coordinates of
  the stops, in order. `trips.route` calls ORS only when that key changes. Editing names, notes, days, or
  stay times keeps the cached route. Moving, adding, removing, or reordering stops, or changing the mode,
  makes it stale. Copying a trip copies its cached route.
- **Failures are remembered when they're about the stops.** If ORS can't route the current stops
  (for example, a stop far from any road), that error is stored with the key and shown until the stops
  change. Timeouts and rate limits aren't stored, so they can be retried.
- **Works without ORS.** With no `ORS_API_KEY`, routing and search are switched off: stops can
  still be added by tapping the map, and legs are drawn as dashed straight lines with distances as
  the crow flies.

### Endpoints used

| Purpose | Endpoint |
| --- | --- |
| Route | `POST /v2/directions/{profile}/geojson` with `coordinates` (`[lon, lat]`), `instructions: false`, `geometry_simplify: true`, and `radiuses` of 5 km so stops snap to the nearest road |
| Place search | `GET /geocode/autocomplete?text=…&size=6` with `focus.point.lat/lon` near the trip |
| Pin names | `GET /geocode/reverse?point.lat=…&point.lon=…&size=1` (a name is used only when the place is within 2 km) |
| Best order | `POST /optimization` (VROOM): middle stops as `jobs`, one vehicle with the first stop as `start` and the last as `end` |

Profiles offered: `driving-car`, `cycling-regular`, `cycling-electric`, `cycling-mountain`,
`foot-walking`, `foot-hiking`, `wheelchair`.

### Limits

These limits mirror the [hosted ORS restrictions](https://giscience.github.io/openrouteservice/hosted-api-restrictions):

| Limit | Value | Where |
| --- | --- | --- |
| Stops per trip | 50 (the ORS waypoint limit) | `TRIP_LIMITS.MAX_STOPS` |
| Route length | 6,000 km, or 300 km for wheelchair. Checked against the straight-line distance before calling ORS | `TRAVEL_MODE_INFO[mode].maxKm` |
| Route requests | 20 per minute per person | `trips.route` |
| Place searches | 60 per minute per person | `trips.search`, `trips.reverse` |
| Best order | 6 per minute per person | `trips.optimize` |
| Trips per person | 200 | `trips.create` |

The rate limits are per web instance and protect the shared ORS quota. Your ORS plan sets the daily
quota. Over it, ORS answers 429 and the planner says the routing service is busy.

ORS errors are translated to plain sentences (`orsErrorMessage`). For example, 2009 becomes "There's no
route between some of these stops…", 2010 becomes "One of the stops is too far from any road…", and
2004 becomes "longer than the routing service allows".

## Configuration

| Variable | Meaning |
| --- | --- |
| `ORS_API_KEY` | Server-only HeiGIT key from [account.heigit.org](https://account.heigit.org). Empty switches routing and search off. |
| `ORS_BASE_URL` | Optional. Point at a self-hosted ORS instance; it defaults to `https://api.openrouteservice.org`. The geocoder and optimization endpoints only exist on the hosted API. |
| `NEXT_PUBLIC_MAP_TILE_URL` | Optional tile URL template. It defaults to the OpenStreetMap standard layer, whose [usage policy](https://operations.osmfoundation.org/policies/tiles/) suits light traffic only. Use a tile provider for production volumes. |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Optional attribution HTML for your tile provider. |

The map always credits OpenStreetMap contributors and openrouteservice by HeiGIT, and the site
footer repeats the credit.

## Data and privacy

- `trip` holds the title, summary, mode, visibility, accent colour, start date, optional project
  link, and the cached route (geometry, per-leg totals, overall totals). `trip_stop` holds each
  stop's name, address, coordinates, type, day, stay time, and notes.
- Private trips are visible only to their owner. Viewers of public and link-only trips can see
  everything in the trip, including notes. The visibility menu says who can see it.
- Stop coordinates are sent to ORS to compute routes, along with search text and dropped pins. No
  account details are sent.
- Trips and stops are deleted with the account (`ON DELETE CASCADE`). If a linked project is
  deleted, the trip stays but the link is cleared.

## Code map

| File | Role |
| --- | --- |
| `packages/db/src/schema.ts` (`trip`, `trip_stop`), `drizzle/0003_trips.sql`, `src/seed-trips.ts` | Schema, migration, three demo trips (stops only, no seeded routes) |
| `packages/api/src/lib/ors.ts` | ORS client and response parsers |
| `packages/api/src/lib/trip-planning.ts` | Pure helpers shared with clients as `@skaddosh/api/trips`: modes, limits, distances, route key, day planning, formatting |
| `packages/api/src/routers/trips.ts` | `config`, `mine`, `explore`, `forProject`, `byId`, `create`, `update`, `delete`, `duplicate`, `addStop`, `updateStop`, `removeStop`, `reorder`, `route`, `optimize`, `search`, `reverse` |
| `packages/api/src/lib/trips.test.ts` | Unit tests for helpers, parsers (using the documented response shapes), error messages, rate limiting |
| `apps/web/src/components/trips/*` | Leaflet map, SVG route preview, trip cards, the planner |
| `apps/web/src/app/trips/*` | `/trips` and `/trips/:id` |
| `apps/mobile/src/screens/Trip*.tsx` | Trips tab and trip view |
