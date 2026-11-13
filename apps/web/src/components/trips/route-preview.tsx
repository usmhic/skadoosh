import { useId } from "react";
import { cn } from "@skaddosh/ui/lib/utils";

type Point = { lat: number; lng: number };

/**
 * A small, dependency-free picture of a route: the computed road geometry when there is one,
 * otherwise straight dashed legs between stops. Uses a simple equirectangular projection fitted
 * to the trip's bounds, which is accurate enough at trip scale.
 */
export function RoutePreview({
  points,
  geometry,
  accent = "#6d4aff",
  className,
  numbered = false,
  grid = true,
}: {
  points: Point[];
  geometry?: Array<[number, number]> | null;
  accent?: string;
  className?: string;
  numbered?: boolean;
  grid?: boolean;
}) {
  const gradientId = useId();
  const W = 400;
  const H = 260;
  const pad = 34;
  const all: Point[] = geometry?.length ? geometry.map(([lng, lat]) => ({ lat, lng })) : points;
  if (!points.length) {
    return <div className={cn("bg-dots rounded-[inherit] bg-muted/60", className)} />;
  }
  const midLat = all.reduce((t, p) => t + p.lat, 0) / all.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = all.map((p) => p.lng * kx);
  const ys = all.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, (maxY - minY) * (W / H), 1e-4);
  const scale = (W - pad * 2) / span;
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const project = (p: Point) => [offX + (p.lng * kx - minX) * scale, H - (offY + (p.lat - minY) * scale)] as const;
  const path = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${project(p).map((n) => n.toFixed(1)).join(" ")}`).join(" ");
  const line = geometry?.length ? geometry.map(([lng, lat]) => ({ lat, lng })) : points;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Route preview" className={cn("block", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${gradientId})`} />
      {grid
        ? Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * (W / 10)} x2={(i + 1) * (W / 10)} y1={0} y2={H} stroke="currentColor" strokeOpacity="0.05" />
          )).concat(
            Array.from({ length: 5 }, (_, i) => (
              <line key={`h${i}`} y1={(i + 1) * (H / 6)} y2={(i + 1) * (H / 6)} x1={0} x2={W} stroke="currentColor" strokeOpacity="0.05" />
            )),
          )
        : null}
      <path d={path(line)} fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={path(line)}
        fill="none"
        stroke={accent}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={geometry?.length ? undefined : "2 7"}
      />
      {points.map((p, i) => {
        const [x, y] = project(p);
        const end = i === 0 || i === points.length - 1;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={numbered ? 10 : end ? 7 : 5} fill={end ? accent : "white"} stroke={accent} strokeWidth="3" />
            {numbered ? (
              <text x={x} y={y + 3.6} textAnchor="middle" fontSize="10" fontWeight="700" fill={end ? "white" : accent}>
                {i + 1}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
