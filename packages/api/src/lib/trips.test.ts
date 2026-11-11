import { test } from "node:test";
import assert from "node:assert/strict";
import { orsErrorMessage, parseDirections, parseOptimizationOrder, parsePlaces } from "./ors";
import { rateLimit } from "./rate-limit";
import {
  applyOrder,
  boundsOf,
  formatDistance,
  formatDuration,
  haversineMeters,
  planDays,
  routeKey,
  straightLineMeters,
} from "./trip-planning";

const marrakech = { lat: 31.6295, lng: -7.9811 };
const ouarzazate = { lat: 30.9189, lng: -6.8934 };

test("haversine distance matches a known pair within 1%", () => {
  // Marrakech to Ouarzazate is about 130 km in a straight line.
  const d = haversineMeters(marrakech, ouarzazate);
  assert.ok(d > 125_000 && d < 135_000, String(d));
  assert.equal(haversineMeters(marrakech, marrakech), 0);
  assert.equal(straightLineMeters([marrakech]), 0);
  assert.equal(Math.round(straightLineMeters([marrakech, ouarzazate, marrakech])), Math.round(2 * d));
});

test("routeKey changes with mode, order, and coordinates, and ignores sub-metre noise", () => {
  const a = routeKey("driving-car", [marrakech, ouarzazate]);
  assert.equal(a, routeKey("driving-car", [marrakech, ouarzazate]));
  assert.notEqual(a, routeKey("foot-walking", [marrakech, ouarzazate]));
  assert.notEqual(a, routeKey("driving-car", [ouarzazate, marrakech]));
  assert.notEqual(a, routeKey("driving-car", [marrakech, { lat: 30.92, lng: -6.8934 }]));
  assert.equal(a, routeKey("driving-car", [marrakech, { lat: 30.918901, lng: -6.893401 }]));
});

test("formatting distances and durations", () => {
  assert.equal(formatDistance(850), "850 m");
  assert.equal(formatDistance(4_250), "4.3 km");
  assert.equal(formatDistance(203_400), "203 km");
  assert.equal(formatDistance(null), "–");
  assert.equal(formatDuration(20), "1 min");
  assert.equal(formatDuration(45 * 60), "45 min");
  assert.equal(formatDuration(2 * 3600), "2 h");
  assert.equal(formatDuration(3 * 3600 + 25 * 60), "3 h 25 min");
  assert.equal(formatDuration(73 * 3600 + 25 * 60), "73 h");
});

test("planDays counts the leg arriving at a stop toward that stop's day", () => {
  const stops = [
    { day: 1, stayMinutes: 0 },
    { day: 1, stayMinutes: 30 },
    { day: 2, stayMinutes: 60 },
    { day: 2, stayMinutes: 0 },
  ];
  const legs = [
    { distance: 1000, duration: 100 },
    { distance: 2000, duration: 200 },
    { distance: 4000, duration: 400 },
  ];
  const days = planDays(stops, legs);
  assert.deepEqual(
    days.map((d) => [d.day, d.stopIndexes, d.distance, d.duration, d.stayMinutes]),
    [
      [1, [0, 1], 1000, 100, 30],
      [2, [2, 3], 6000, 600, 60],
    ],
  );
  assert.equal(planDays(stops, null)[1]!.distance, 0);
});

test("boundsOf and applyOrder", () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([marrakech, ouarzazate]), [
    [30.9189, -7.9811],
    [31.6295, -6.8934],
  ]);
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(applyOrder(items, ["c", "a", "zzz"]).map((i) => i.id), ["c", "a", "b"]);
});

// Fixtures follow the documented shapes: directions GeoJSON (FeatureCollection with a LineString
// feature whose properties carry summary, segments, and way_points), Pelias features, VROOM steps.

test("parseDirections reads geometry, totals, and per-leg segments", () => {
  const body = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[-7.98111, 31.62951], [-7.5, 31.4], [-6.89341, 30.91891]] },
        properties: {
          segments: [
            { distance: 120_000.4, duration: 7200.2, steps: [] },
            { distance: 83_000, duration: 4100 },
          ],
          summary: { distance: 203_000.4, duration: 11_300.2 },
          way_points: [0, 1, 2],
        },
      },
    ],
  };
  const parsed = parseDirections(body)!;
  assert.equal(parsed.geometry.length, 3);
  assert.deepEqual(parsed.geometry[0], [-7.98111, 31.62951]);
  assert.equal(parsed.distance, 203_000.4);
  assert.equal(parsed.legs.length, 2);
  assert.equal(parsed.legs[1]!.duration, 4100);
});

test("parseDirections falls back to summed segments when the summary omits zeros", () => {
  const body = {
    features: [
      {
        geometry: { type: "LineString", coordinates: [[1, 2], [1.001, 2.001]] },
        properties: { segments: [{ distance: 150, duration: 30 }], summary: {} },
      },
    ],
  };
  const parsed = parseDirections(body)!;
  assert.equal(parsed.distance, 150);
  assert.equal(parsed.duration, 30);
});

test("parseDirections rejects responses without a usable line", () => {
  assert.equal(parseDirections(null), null);
  assert.equal(parseDirections({ features: [] }), null);
  assert.equal(parseDirections({ features: [{ geometry: { type: "Point", coordinates: [1, 2] } }] }), null);
  assert.equal(parseDirections({ features: [{ geometry: { type: "LineString", coordinates: [[1, 2]] } }] }), null);
});

test("parsePlaces reads Pelias features and skips malformed ones", () => {
  const body = {
    features: [
      {
        geometry: { type: "Point", coordinates: [-7.9811, 31.6295] },
        properties: { gid: "whosonfirst:locality:1", name: "Marrakech", label: "Marrakech, Morocco", layer: "locality", country: "Morocco" },
      },
      { geometry: { type: "Point", coordinates: ["x", 1] }, properties: { name: "Broken" } },
      { geometry: { type: "Point", coordinates: [1, 2] }, properties: { label: "Somewhere, Nowhere" } },
    ],
  };
  const places = parsePlaces(body);
  assert.equal(places.length, 2);
  assert.deepEqual(places[0], {
    id: "whosonfirst:locality:1",
    name: "Marrakech",
    label: "Marrakech, Morocco",
    lat: 31.6295,
    lng: -7.9811,
    layer: "locality",
    country: "Morocco",
  });
  assert.equal(places[1]!.name, "Somewhere");
  assert.deepEqual(parsePlaces({}), []);
});

test("parseOptimizationOrder reads job steps (id or legacy job) and rejects partial plans", () => {
  const steps = [{ type: "start" }, { type: "job", id: 2 }, { type: "job", job: 0 }, { type: "job", id: 1 }, { type: "end" }];
  assert.deepEqual(parseOptimizationOrder({ code: 0, routes: [{ steps }] }, 3), [2, 0, 1]);
  assert.equal(parseOptimizationOrder({ routes: [{ steps }], unassigned: [{ id: 3 }] }, 3), null);
  assert.equal(parseOptimizationOrder({ routes: [{ steps }] }, 4), null);
  assert.equal(parseOptimizationOrder({ routes: [] }, 1), null);
});

test("ORS error codes become actionable sentences", () => {
  assert.match(orsErrorMessage(404, { error: { code: 2009, message: "Route could not be found" } }), /no route/);
  assert.match(orsErrorMessage(404, { error: { code: 2010, message: "Point not found" } }), /too far from any road/);
  assert.match(orsErrorMessage(400, { error: { code: 2004 } }), /longer than/);
  assert.match(orsErrorMessage(429, null), /busy/);
  assert.match(orsErrorMessage(403, { error: "Access to this API has been disallowed" }), /isn't available/);
  assert.match(orsErrorMessage(500, null), /Couldn't work out a route/);
});

test("rateLimit allows up to the limit per window, then refuses until it resets", () => {
  const key = `test:${Math.random()}`;
  rateLimit(key, 2, 1000, 0);
  rateLimit(key, 2, 1000, 10);
  assert.throws(() => rateLimit(key, 2, 1000, 20), /Slow down/);
  rateLimit(key, 2, 1000, 1001);
});
