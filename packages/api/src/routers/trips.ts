import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db, project, TRAVEL_MODES, TRIP_VISIBILITIES, trip, tripStop, user, type PlacePhoto } from "@skaddosh/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { autocomplete, directions, orsConfig, reverseGeocode } from "../lib/ors";
import { rateLimit } from "../lib/rate-limit";
import { haversineMeters, routeKey, straightLineMeters, TRAVEL_MODE_INFO, TRIP_LIMITS } from "../lib/trip-planning";

type TripRow = typeof trip.$inferSelect;
type StopRow = typeof tripStop.$inferSelect;

const lat = z.number().min(-90).max(90);
const photo = z.object({ url: z.string().url().max(2000), caption: z.string().trim().max(280).default("") });
const photos = z.array(photo).max(TRIP_LIMITS.MAX_PHOTOS_PER_PLACE);

/** The collection's cover: its chosen cover image, else the first photo of any place. */
function coverOf(row: TripRow, stops: StopRow[]): string | null {
  return row.coverImage ?? stops.flatMap((s) => s.photos)[0]?.url ?? null;
}
const lng = z.number().min(-180).max(180);
const MINUTE = 60_000;

async function stopsOf(tripId: string) {
  return db.select().from(tripStop).where(eq(tripStop.tripId, tripId)).orderBy(asc(tripStop.position));
}

async function ownedTrip(tripId: string, userId: string): Promise<TripRow> {
  const [row] = await db.select().from(trip).where(eq(trip.id, tripId)).limit(1);
  if (!row || row.ownerId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: "Travel collection not found." });
  return row;
}

/** Owners see everything; anyone with the link sees public and unlisted trips. */
async function viewableTrip(tripId: string, viewerId: string | undefined): Promise<TripRow> {
  const [row] = await db.select().from(trip).where(eq(trip.id, tripId)).limit(1);
  if (!row || (row.visibility === "private" && row.ownerId !== viewerId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Travel collection not found." });
  }
  return row;
}

async function touch(tripId: string) {
  await db.update(trip).set({ updatedAt: new Date() }).where(eq(trip.id, tripId));
}

/** Renumber positions 0…n-1 in the given order. */
async function writeOrder(tripId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (const [position, id] of orderedIds.entries()) {
      await tx.update(tripStop).set({ position }).where(and(eq(tripStop.id, id), eq(tripStop.tripId, tripId)));
    }
  });
}

function tripView(row: TripRow, stops: StopRow[]) {
  const currentKey = stops.length >= 2 ? routeKey(row.mode, stops) : null;
  const routeCurrent = Boolean(currentKey && row.routeKey === currentKey && row.routeGeometry);
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    mode: row.mode,
    visibility: row.visibility,
    accentColor: row.accentColor,
    coverImage: row.coverImage,
    cover: coverOf(row, stops),
    startDate: row.startDate,
    projectId: row.projectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stops: stops.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      story: s.notes,
      photos: s.photos as PlacePhoto[],
    })),
    route: routeCurrent
      ? {
          geometry: row.routeGeometry!,
          legs: row.routeLegs ?? [],
          distance: row.routeDistanceM ?? 0,
          duration: row.routeDurationS ?? 0,
          computedAt: row.routeComputedAt,
        }
      : null,
    /** Set when the last attempt for the current stops failed. */
    routeError: currentKey && row.routeKey === currentKey ? row.routeError : null,
    /** True when stops changed since the cached route, so the client should ask for a new one. */
    routeStale: Boolean(currentKey) && !routeCurrent && !(row.routeKey === currentKey && row.routeError),
    straightLineDistance: straightLineMeters(stops),
  };
}

/** Compute and cache the route if the cached one doesn't match the current stops. */
async function ensureRoute(row: TripRow, stops: StopRow[], rateKey: string) {
  if (stops.length < 2) return;
  const key = routeKey(row.mode, stops);
  if (row.routeKey === key && (row.routeGeometry || row.routeError)) return;
  if (!orsConfig().enabled) return;
  const span = straightLineMeters(stops) / 1000;
  const maxKm = TRAVEL_MODE_INFO[row.mode].maxKm;
  if (span > maxKm) {
    await db
      .update(trip)
      .set({ routeKey: key, routeError: `Routes can be up to ${maxKm.toLocaleString("en")} km. Split this trip into shorter ones.`, routeGeometry: null, routeLegs: null, routeDistanceM: null, routeDurationS: null, routeComputedAt: new Date() })
      .where(eq(trip.id, row.id));
    return;
  }
  rateLimit(rateKey, 20, MINUTE);
  try {
    const result = await directions(row.mode, stops.map((s) => [s.lng, s.lat]));
    await db
      .update(trip)
      .set({
        routeKey: key,
        routeError: null,
        routeGeometry: result.geometry,
        routeLegs: result.legs,
        routeDistanceM: Math.round(result.distance),
        routeDurationS: Math.round(result.duration),
        routeComputedAt: new Date(),
      })
      .where(eq(trip.id, row.id));
  } catch (error) {
    // Remember routing failures for these exact stops (no route, too far from a road), but not
    // transient ones (timeouts, rate limits), which are worth retrying.
    if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
      await db
        .update(trip)
        .set({ routeKey: key, routeError: error.message, routeGeometry: null, routeLegs: null, routeDistanceM: null, routeDurationS: null, routeComputedAt: new Date() })
        .where(eq(trip.id, row.id));
      return;
    }
    throw error;
  }
}

const tripFields = {
  title: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(1000).optional(),
  mode: z.enum(TRAVEL_MODES).optional(),
  visibility: z.enum(TRIP_VISIBILITIES).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  coverImage: z.string().url().max(2000).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  projectId: z.string().nullable().optional(),
};

async function assertOwnProject(projectId: string | null | undefined, userId: string) {
  if (!projectId) return;
  const [row] = await db.select({ creatorId: project.creatorId }).from(project).where(eq(project.id, projectId)).limit(1);
  if (!row || row.creatorId !== userId) throw new TRPCError({ code: "BAD_REQUEST", message: "You can only link travel collections to your own projects." });
}

/** Card data for lists: stops for a mini map, plus totals. */
async function tripCards(rows: TripRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [stops, owners, projects] = await Promise.all([
    db.select().from(tripStop).where(inArray(tripStop.tripId, ids)).orderBy(asc(tripStop.position)),
    db
      .select({ id: user.id, name: user.name, username: user.username, image: user.image, verified: user.verificationStatus })
      .from(user)
      .where(inArray(user.id, [...new Set(rows.map((r) => r.ownerId))])),
    db
      .select({ id: project.id, title: project.title })
      .from(project)
      .where(inArray(project.id, rows.map((r) => r.projectId).filter((id): id is string => Boolean(id)).concat("__none__"))),
  ]);
  return rows.map((row) => {
    const own = stops.filter((s) => s.tripId === row.id);
    const view = tripView(row, own);
    const owner = owners.find((o) => o.id === row.ownerId);
    const allPhotos = own.flatMap((s) => s.photos as PlacePhoto[]);
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      mode: row.mode,
      visibility: row.visibility,
      accentColor: row.accentColor,
      startDate: row.startDate,
      updatedAt: row.updatedAt,
      cover: coverOf(row, own),
      photoCount: allPhotos.length,
      previewPhotos: allPhotos.slice(0, 4).map((p) => p.url),
      stopCount: own.length,
      from: own[0]?.name ?? null,
      to: own.length > 1 ? own[own.length - 1]!.name : null,
      points: own.map((s) => ({ lat: s.lat, lng: s.lng })),
      geometry: view.route?.geometry ?? null,
      distance: view.route?.distance ?? null,
      duration: view.route?.duration ?? null,
      straightLineDistance: view.straightLineDistance,
      owner: owner
        ? { name: owner.name, username: owner.username, image: owner.image, verified: owner.verified === "verified" }
        : null,
      project: projects.find((p) => p.id === row.projectId) ?? null,
    };
  });
}

export const tripsRouter = router({
  /** What the client can offer: routing and place search need ORS_API_KEY on the server. */
  config: publicProcedure.query(() => ({
    routing: orsConfig().enabled,
    maxStops: TRIP_LIMITS.MAX_STOPS,
  })),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(trip).where(eq(trip.ownerId, ctx.session.user.id)).orderBy(desc(trip.updatedAt));
    return tripCards(rows);
  }),

  /** Public journeys by everyone, newest first. */
  explore: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(48).default(24) }).optional())
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(trip)
        .where(and(eq(trip.visibility, "public"), sql`exists (select 1 from ${tripStop} where ${tripStop.tripId} = ${trip.id})`))
        .orderBy(desc(trip.updatedAt))
        .limit(input?.limit ?? 24);
      return tripCards(rows);
    }),

  /** A creator's public travel collections, for their profile. */
  byOwner: publicProcedure.input(z.object({ username: z.string().min(1).max(64) })).query(async ({ input }) => {
    const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.username, input.username)).limit(1);
    if (!owner) return [];
    const rows = await db
      .select()
      .from(trip)
      .where(and(eq(trip.ownerId, owner.id), eq(trip.visibility, "public")))
      .orderBy(desc(trip.startDate), desc(trip.updatedAt));
    return tripCards(rows);
  }),

  /** Public trips attached to a project, for its page. */
  forProject: publicProcedure.input(z.object({ projectId: z.string() })).query(async ({ input }) => {
    const rows = await db
      .select()
      .from(trip)
      .where(and(eq(trip.projectId, input.projectId), eq(trip.visibility, "public")))
      .orderBy(desc(trip.updatedAt));
    return tripCards(rows);
  }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const viewerId = ctx.session?.user?.id;
    const row = await viewableTrip(input.id, viewerId);
    const [stops, [owner], [linked]] = await Promise.all([
      stopsOf(row.id),
      db
        .select({ name: user.name, username: user.username, image: user.image, verified: user.verificationStatus })
        .from(user)
        .where(eq(user.id, row.ownerId))
        .limit(1),
      row.projectId
        ? db.select({ id: project.id, title: project.title, status: project.status }).from(project).where(eq(project.id, row.projectId)).limit(1)
        : Promise.resolve([undefined]),
    ]);
    return {
      ...tripView(row, stops),
      isOwner: viewerId === row.ownerId,
      owner: owner ? { name: owner.name, username: owner.username, image: owner.image, verified: owner.verified === "verified" } : null,
      project: linked && (linked.status === "published" || viewerId === row.ownerId) ? { id: linked.id, title: linked.title } : null,
    };
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().trim().max(120).optional(), mode: z.enum(TRAVEL_MODES).optional(), projectId: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      await assertOwnProject(input?.projectId, ctx.session.user.id);
      const [owned] = await db.select({ n: count() }).from(trip).where(eq(trip.ownerId, ctx.session.user.id));
      if ((owned?.n ?? 0) >= 200) throw new TRPCError({ code: "BAD_REQUEST", message: "You've reached 200 travel collections. Delete an old one first." });
      const id = `trip_${randomUUID().slice(0, 8)}`;
      await db.insert(trip).values({
        id,
        ownerId: ctx.session.user.id,
        title: input?.title || "Untitled collection",
        mode: input?.mode ?? "driving-car",
        projectId: input?.projectId ?? null,
      });
      return { id };
    }),

  update: protectedProcedure.input(z.object({ id: z.string(), ...tripFields })).mutation(async ({ ctx, input }) => {
    await ownedTrip(input.id, ctx.session.user.id);
    await assertOwnProject(input.projectId, ctx.session.user.id);
    const { id, ...fields } = input;
    await db
      .update(trip)
      .set({ ...fields, ...(fields.title !== undefined ? { title: fields.title || "Untitled collection" } : {}), updatedAt: new Date() })
      .where(eq(trip.id, id));
    return { ok: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ownedTrip(input.id, ctx.session.user.id);
    await db.delete(trip).where(eq(trip.id, input.id));
    return { ok: true };
  }),

  /** Copy someone's public trip into your own trips, to adapt it. */
  duplicate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const source = await viewableTrip(input.id, ctx.session.user.id);
    const stops = await stopsOf(source.id);
    const id = `trip_${randomUUID().slice(0, 8)}`;
    await db.transaction(async (tx) => {
      await tx.insert(trip).values({
        id,
        ownerId: ctx.session.user.id,
        title: source.ownerId === ctx.session.user.id ? `${source.title} (copy)` : source.title,
        summary: source.summary,
        mode: source.mode,
        accentColor: source.accentColor,
        coverImage: source.coverImage,
        // The cached route still matches the copied stops, so it's reused without calling ORS.
        routeGeometry: source.routeGeometry,
        routeLegs: source.routeLegs,
        routeDistanceM: source.routeDistanceM,
        routeDurationS: source.routeDurationS,
        routeKey: source.routeKey,
        routeError: source.routeError,
        routeComputedAt: source.routeComputedAt,
      });
      if (stops.length) {
        await tx.insert(tripStop).values(
          stops.map((s) => ({
            tripId: id,
            position: s.position,
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            notes: s.notes,
            photos: s.photos,
          })),
        );
      }
    });
    return { id };
  }),

  addStop: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        name: z.string().trim().min(1).max(120),
        address: z.string().trim().max(300).default(""),
        lat,
        lng,
        story: z.string().trim().max(2000).default(""),
        photos: photos.default([]),
        /** Insert before this index. Defaults to the end. */
        position: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedTrip(input.tripId, ctx.session.user.id);
      const stops = await stopsOf(input.tripId);
      if (stops.length >= TRIP_LIMITS.MAX_STOPS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `A travel collection can have up to ${TRIP_LIMITS.MAX_STOPS} places.` });
      }
      const position = Math.min(input.position ?? stops.length, stops.length);
      const id = randomUUID();
      await db.transaction(async (tx) => {
        for (const s of stops.slice(position)) {
          await tx.update(tripStop).set({ position: s.position + 1 }).where(eq(tripStop.id, s.id));
        }
        await tx.insert(tripStop).values({
          id,
          tripId: input.tripId,
          position,
          name: input.name,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          notes: input.story,
          photos: input.photos,
        });
      });
      await touch(input.tripId);
      return { id };
    }),

  updateStop: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(120).optional(),
        story: z.string().trim().max(2000).optional(),
        photos: photos.optional(),
        lat: lat.optional(),
        lng: lng.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [stop] = await db.select().from(tripStop).where(eq(tripStop.id, input.id)).limit(1);
      if (!stop) throw new TRPCError({ code: "NOT_FOUND", message: "Place not found." });
      await ownedTrip(stop.tripId, ctx.session.user.id);
      const { id, story, ...fields } = input;
      await db.update(tripStop).set({ ...fields, ...(story !== undefined ? { notes: story } : {}) }).where(eq(tripStop.id, id));
      await touch(stop.tripId);
      return { ok: true };
    }),

  removeStop: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const [stop] = await db.select().from(tripStop).where(eq(tripStop.id, input.id)).limit(1);
    if (!stop) throw new TRPCError({ code: "NOT_FOUND", message: "Place not found." });
    await ownedTrip(stop.tripId, ctx.session.user.id);
    await db.delete(tripStop).where(eq(tripStop.id, input.id));
    const rest = await stopsOf(stop.tripId);
    await writeOrder(stop.tripId, rest.map((s) => s.id));
    await touch(stop.tripId);
    return { ok: true };
  }),

  reorder: protectedProcedure
    .input(z.object({ tripId: z.string(), stopIds: z.array(z.string()).max(TRIP_LIMITS.MAX_STOPS) }))
    .mutation(async ({ ctx, input }) => {
      await ownedTrip(input.tripId, ctx.session.user.id);
      const stops = await stopsOf(input.tripId);
      const known = new Set(stops.map((s) => s.id));
      if (input.stopIds.length !== stops.length || input.stopIds.some((id) => !known.has(id)) || new Set(input.stopIds).size !== stops.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The places changed. Refresh and try again." });
      }
      await writeOrder(input.tripId, input.stopIds);
      await touch(input.tripId);
      return { ok: true };
    }),

  /** Compute the route for the current stops if the cached one is out of date. Safe to call often. */
  route: publicProcedure.input(z.object({ tripId: z.string() })).mutation(async ({ ctx, input }) => {
    const viewerId = ctx.session?.user?.id;
    const row = await viewableTrip(input.tripId, viewerId);
    const stops = await stopsOf(row.id);
    await ensureRoute(row, stops, `route:${viewerId ?? "anon"}`);
    const [fresh] = await db.select().from(trip).where(eq(trip.id, row.id)).limit(1);
    const view = tripView(fresh!, stops);
    return { route: view.route, routeError: view.routeError, routeStale: view.routeStale };
  }),


  /** Place search for adding stops. */
  search: protectedProcedure
    .input(z.object({ q: z.string().trim().min(2).max(120), near: z.object({ lat, lng }).optional() }))
    .query(async ({ ctx, input }) => {
      if (!orsConfig().enabled) return [];
      rateLimit(`search:${ctx.session.user.id}`, 60, MINUTE);
      return autocomplete(input.q, input.near);
    }),

  /** Name a point dropped on the map. Falls back to its coordinates when routing is off. */
  reverse: protectedProcedure.input(z.object({ lat, lng })).query(async ({ ctx, input }) => {
    const fallback = { name: `Pin ${input.lat.toFixed(3)}, ${input.lng.toFixed(3)}`, label: "", lat: input.lat, lng: input.lng };
    if (!orsConfig().enabled) return fallback;
    rateLimit(`search:${ctx.session.user.id}`, 60, MINUTE);
    const place = await reverseGeocode(input.lat, input.lng).catch(() => null);
    // Keep the exact dropped point, but use the nearest place's name if it's close by.
    if (!place || haversineMeters(place, input) > 2_000) return fallback;
    return { name: place.name, label: place.label, lat: input.lat, lng: input.lng };
  }),
});
