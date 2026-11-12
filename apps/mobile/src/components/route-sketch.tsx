import React, { useState } from "react";
import { View, Text, type LayoutChangeEvent } from "react-native";
import { theme as T } from "@/lib/theme";

type Point = { lat: number; lng: number };

/**
 * A route drawn with plain views (no SVG or map dependency): each segment is a thin rotated bar,
 * each stop a numbered dot. Uses the computed road geometry when there is one, straight legs otherwise.
 */
export function RouteSketch({
  points,
  geometry,
  accent,
  height = 200,
  numbered = true,
}: {
  points: Point[];
  geometry?: Array<[number, number]> | null;
  accent: string;
  height?: number;
  numbered?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pad = 22;
  const line: Point[] = geometry?.length ? geometry.map(([lng, lat]) => ({ lat, lng })) : points;
  // Keep at most ~80 segments: plenty for a sketch, cheap to render.
  const step = Math.max(1, Math.ceil(line.length / 80));
  const sampled = line.filter((_, i) => i % step === 0 || i === line.length - 1);

  let project = (p: Point) => [0, 0] as [number, number];
  if (width && points.length) {
    const all = [...sampled, ...points];
    const midLat = all.reduce((t, p) => t + p.lat, 0) / all.length;
    const kx = Math.cos((midLat * Math.PI) / 180);
    const xs = all.map((p) => p.lng * kx);
    const ys = all.map((p) => p.lat);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys) - minY;
    const scale = Math.min((width - pad * 2) / Math.max(spanX, 1e-4), (height - pad * 2) / Math.max(spanY, 1e-4));
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    project = (p) => [offX + (p.lng * kx - minX) * scale, height - (offY + (p.lat - minY) * scale)];
  }

  return (
    <View onLayout={onLayout} style={{ height, borderRadius: T.radius.xl, overflow: "hidden", backgroundColor: `${accent}14` }}>
      {width
        ? sampled.slice(1).map((p, i) => {
            const [x1, y1] = project(sampled[i]!);
            const [x2, y2] = project(p);
            const length = Math.hypot(x2 - x1, y2 - y1);
            if (length < 0.5) return null;
            const angle = Math.atan2(y2 - y1, x2 - x1);
            return (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: (x1 + x2) / 2 - length / 2,
                  top: (y1 + y2) / 2 - 2,
                  width: length,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: accent,
                  opacity: geometry?.length ? 1 : 0.55,
                  transform: [{ rotate: `${angle}rad` }],
                }}
              />
            );
          })
        : null}
      {width
        ? points.map((p, i) => {
            const [x, y] = project(p);
            const end = i === 0 || i === points.length - 1;
            const size = numbered ? 22 : end ? 14 : 10;
            return (
              <View
                key={`s${i}`}
                style={{
                  position: "absolute",
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: end ? accent : "#fff",
                  borderWidth: 3,
                  borderColor: accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {numbered ? <Text style={{ fontSize: 9, fontWeight: "800", color: end ? "#fff" : accent }}>{i + 1}</Text> : null}
              </View>
            );
          })
        : null}
    </View>
  );
}
