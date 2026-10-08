/**
 * Deterministic generative artwork for works without an uploaded cover. The same id always draws
 * the same image; each medium has its own visual motif. Pure SVG, no dependencies.
 */
import { cn } from "@skaddosh/ui/lib/utils";

function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RATIOS = [4 / 5, 1, 3 / 4, 5 / 4] as const;

/** Aspect ratio (width / height) a tile should use, varied by id for a masonry rhythm. */
export function coverRatio(id: string) {
  return RATIOS[hashString(id) % RATIOS.length]!;
}

export function GenerativeCover({
  id,
  accent,
  medium,
  title,
  className,
}: {
  id: string;
  accent: string;
  medium: string;
  title?: string;
  className?: string;
}) {
  const rand = rng(hashString(`${id}:${medium}`));
  const W = 400;
  const H = 400;
  const tone = (opacity: number) => `color-mix(in oklch, ${accent} ${Math.round(opacity * 100)}%, transparent)`;
  const shapes: React.ReactNode[] = [];

  switch (medium) {
    case "music":
      for (let i = 0; i < 9; i++) {
        const r = 30 + i * 26 + rand() * 6;
        shapes.push(<circle key={i} cx={W * 0.5} cy={H * 0.62} r={r} fill="none" stroke={tone(0.75 - i * 0.07)} strokeWidth={3 + rand() * 6} />);
      }
      break;
    case "design":
      for (let x = 0; x < 6; x++)
        for (let y = 0; y < 6; y++) {
          const s = 30 + rand() * 30;
          if (rand() > 0.45)
            shapes.push(
              <rect key={`${x}-${y}`} x={x * 66 + 8} y={y * 66 + 8} width={s} height={s} rx={rand() > 0.6 ? s / 2 : 6} fill={tone(0.2 + rand() * 0.7)} />,
            );
        }
      break;
    case "software":
      for (let i = 0; i < 14; i++) {
        const indent = Math.floor(rand() * 4) * 22;
        shapes.push(
          <rect key={i} x={36 + indent} y={36 + i * 24} width={60 + rand() * 200} height={10} rx={5} fill={tone(i % 5 === 0 ? 0.9 : 0.25 + rand() * 0.4)} />,
        );
      }
      break;
    case "film":
      for (let i = 0; i < 7; i++) {
        shapes.push(<rect key={i} x={0} y={i * 60 + rand() * 10} width={W} height={20 + rand() * 30} fill={tone(0.15 + rand() * 0.6)} />);
      }
      shapes.push(<circle key="sun" cx={W * (0.3 + rand() * 0.4)} cy={H * 0.45} r={70} fill={tone(0.9)} />);
      break;
    case "games":
      for (let x = 0; x < 10; x++)
        for (let y = 0; y < 10; y++) {
          if (rand() > 0.62) shapes.push(<rect key={`${x}-${y}`} x={x * 40} y={y * 40} width={40} height={40} fill={tone(0.25 + rand() * 0.75)} />);
        }
      break;
    case "research":
      for (let i = 0; i < 12; i++) {
        const y = 40 + i * 30;
        const d = `M0 ${y} C ${W * 0.3} ${y - 40 + rand() * 80}, ${W * 0.7} ${y - 40 + rand() * 80}, ${W} ${y + rand() * 20}`;
        shapes.push(<path key={i} d={d} fill="none" stroke={tone(0.25 + (i % 3) * 0.25)} strokeWidth={2.5} />);
      }
      break;
    case "photography":
      for (let i = 0; i < 9; i++) {
        shapes.push(<circle key={i} cx={rand() * W} cy={rand() * H} r={40 + rand() * 90} fill={tone(0.12 + rand() * 0.35)} />);
      }
      break;
    case "writing":
      break;
    default:
      for (let i = 0; i < 6; i++) {
        const cx = rand() * W;
        const cy = rand() * H;
        shapes.push(<ellipse key={i} cx={cx} cy={cy} rx={60 + rand() * 120} ry={40 + rand() * 100} fill={tone(0.15 + rand() * 0.55)} transform={`rotate(${rand() * 180} ${cx} ${cy})`} />);
      }
      shapes.push(<circle key="dot" cx={W * (0.2 + rand() * 0.6)} cy={H * (0.2 + rand() * 0.6)} r={28} fill={tone(1)} />);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn("size-full", className)}
      style={{ background: `color-mix(in oklch, ${accent} 9%, var(--card))` }}
    >
      {shapes}
      {medium === "writing" && title ? (
        <text
          x={W * 0.08}
          y={H * 0.86}
          fill={tone(0.9)}
          style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontSize: 300, fontStyle: "italic" }}
        >
          {title.trim().charAt(0).toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
