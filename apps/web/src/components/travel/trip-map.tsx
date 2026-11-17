"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@skaddosh/ui/lib/utils";

export type MapStop = { id: string; lat: number; lng: number; name: string; photo?: string | null };

// Public tile configuration (no secrets). Defaults to the OpenStreetMap standard layer, whose
// usage policy suits light traffic; set your own tile provider for production volumes.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ROUTING_ATTRIBUTION = 'Routing &copy; <a href="https://openrouteservice.org">openrouteservice</a> by HeiGIT';

const escapeAttr = (value: string) => value.replace(/["&<>]/g, (c) => ({ '"': "&quot;", "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

function markerSize(stop: MapStop, selected: boolean) {
  return stop.photo ? (selected ? 56 : 44) : selected ? 34 : 28;
}

function markerHtml(stop: MapStop, index: number, total: number, accent: string, selected: boolean) {
  if (stop.photo) {
    // Photo pin: the place's first photo in a ring of the collection colour, numbered.
    const size = markerSize(stop, selected);
    return `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;border:3px solid ${selected ? accent : "white"};box-shadow:0 6px 18px -6px rgba(20,16,50,.55)${selected ? `,0 0 0 3px ${accent}` : ""};background:#ddd url(&quot;${escapeAttr(stop.photo)}&quot;) center/cover no-repeat;"><span style="position:absolute;right:-6px;bottom:-6px;min-width:20px;height:20px;padding:0 4px;border-radius:999px;background:${accent};color:white;font:700 11px/20px var(--font-geist),system-ui,sans-serif;text-align:center;border:2px solid white;">${index + 1}</span></div>`;
  }
  const end = index === 0 || index === total - 1;
  const size = markerSize(stop, selected);
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;display:flex;align-items:center;justify-content:center;font:700 ${selected ? 13 : 12}px/1 var(--font-geist),system-ui,sans-serif;background:${end || selected ? accent : "white"};color:${end || selected ? "white" : accent};border:3px solid ${selected ? "white" : accent};box-shadow:0 4px 14px -4px rgba(20,16,50,.45)${selected ? `,0 0 0 3px ${accent}` : ""};">${index + 1}</div>`;
}

/**
 * Interactive trip map (Leaflet + raster tiles). Leaflet touches `window`, so it's imported in an
 * effect and never on the server.
 */
export function TripMap({
  stops,
  geometry,
  accent,
  selectedId,
  onSelect,
  onMapClick,
  onMoveStop,
  fitKey,
  className,
  picking = false,
}: {
  stops: MapStop[];
  geometry: Array<[number, number]> | null;
  accent: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMoveStop?: (id: string, lat: number, lng: number) => void;
  /** Change this to re-fit the view to all stops. */
  fitKey?: string;
  className?: string;
  picking?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const handlers = useRef({ onSelect, onMapClick, onMoveStop });
  handlers.current = { onSelect, onMapClick, onMoveStop };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([20, 0], 2);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: `${TILE_ATTRIBUTION} · ${ROUTING_ATTRIBUTION}` }).addTo(map);
      map.attributionControl.setPrefix(false);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => handlers.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      // The container may have been laid out after creation (e.g. inside a flex panel).
      setTimeout(() => map.invalidateSize(), 50);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw markers and the line whenever the data changes.
  useEffect(() => {
    const draw = () => {
      const L = leafletRef.current;
      const layer = layerRef.current;
      if (!L || !layer) return false;
      layer.clearLayers();
      const line: Leaflet.LatLngExpression[] = geometry?.length ? geometry.map(([lng, lat]) => [lat, lng]) : stops.map((s) => [s.lat, s.lng]);
      if (line.length > 1) {
        L.polyline(line, { color: "white", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }).addTo(layer);
        L.polyline(line, {
          color: accent,
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
          dashArray: geometry?.length ? undefined : "2 10",
          interactive: false,
        }).addTo(layer);
      }
      stops.forEach((stop, index) => {
        const selected = stop.id === selectedId;
        const size = markerSize(stop, selected);
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({ html: markerHtml(stop, index, stops.length, accent, selected), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          draggable: Boolean(handlers.current.onMoveStop),
          keyboard: true,
          title: stop.name,
          alt: `${index + 1}. ${stop.name}`,
          zIndexOffset: selected ? 1000 : 0,
        }).addTo(layer);
        marker.bindTooltip(`${index + 1}. ${stop.name}`, { direction: "top", offset: [0, -size / 2] });
        marker.on("click", () => handlers.current.onSelect?.(stop.id));
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          handlers.current.onMoveStop?.(stop.id, p.lat, p.lng);
        });
      });
      return true;
    };
    if (draw()) return;
    // Leaflet is still loading: try again shortly.
    const timer = setInterval(() => draw() && clearInterval(timer), 100);
    return () => clearInterval(timer);
  }, [stops, geometry, accent, selectedId]);

  // Fit to all stops when asked.
  useEffect(() => {
    const fit = () => {
      const L = leafletRef.current;
      const map = mapRef.current;
      if (!L || !map) return false;
      map.invalidateSize();
      if (stops.length === 1) map.setView([stops[0]!.lat, stops[0]!.lng], 11);
      else if (stops.length > 1) map.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng])), { padding: [48, 48], maxZoom: 14 });
      return true;
    };
    if (fit()) return;
    const timer = setInterval(() => fit() && clearInterval(timer), 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Pan to the selected stop.
  useEffect(() => {
    const stop = stops.find((s) => s.id === selectedId);
    const map = mapRef.current;
    if (stop && map && !map.getBounds().pad(-0.1).contains([stop.lat, stop.lng])) map.panTo([stop.lat, stop.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Travel map"
      className={cn("isolate z-0 bg-muted [&_.leaflet-control-attribution]:text-[10px]", picking && "[&_.leaflet-container]:cursor-crosshair cursor-crosshair", className)}
    />
  );
}
