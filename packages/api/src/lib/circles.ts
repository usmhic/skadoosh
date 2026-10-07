/**
 * Circles are craft-based communities. In phase 1 a circle is a curated set of tags and work
 * types with its own Discover page (see docs/PRODUCT.md § Circles).
 */
import type { WorkType } from "@skaddosh/db";

export type Circle = {
  slug: string;
  name: string;
  blurb: string;
  /** Matches lowercase item tags. */
  tags: string[];
  workTypes: WorkType[];
  /** Icon key the clients map to their own icon set. */
  icon: "feather" | "quote" | "lightbulb" | "palette" | "music" | "gamepad" | "clapperboard" | "archive";
};

export const CIRCLES: Circle[] = [
  {
    slug: "short-fiction",
    name: "Short Fiction",
    blurb: "Stories, speculative worlds, and serials written one chapter at a time.",
    tags: ["fiction", "story", "short-fiction", "speculative", "novel", "serial", "literature"],
    workTypes: ["story", "novel"],
    icon: "feather",
  },
  {
    slug: "poetry",
    name: "Poetry",
    blurb: "Poems, fragments, and translations that read well out loud.",
    tags: ["poetry", "poem", "verse", "translation"],
    workTypes: ["poem"],
    icon: "quote",
  },
  {
    slug: "essays-ideas",
    name: "Essays & Ideas",
    blurb: "Long-form thinking on culture, craft, technology, and how we live.",
    tags: ["essay", "philosophy", "culture", "society", "technology", "software", "design", "rituals"],
    workTypes: ["essay", "article"],
    icon: "lightbulb",
  },
  {
    slug: "visual-art",
    name: "Visual Art",
    blurb: "Illustration, comics, photography, and design made by hand.",
    tags: ["art", "illustration", "comics", "photography", "visual", "zine", "type-design"],
    workTypes: [],
    icon: "palette",
  },
  {
    slug: "music-sound",
    name: "Music & Sound",
    blurb: "Albums in progress, field recordings, and sound for other people's work.",
    tags: ["music", "sound", "audio", "album", "field-recording"],
    workTypes: [],
    icon: "music",
  },
  {
    slug: "games-interactive",
    name: "Games & Interactive",
    blurb: "Small games, interactive fiction, and playful tools.",
    tags: ["games", "game", "interactive", "interactive-fiction", "tools"],
    workTypes: [],
    icon: "gamepad",
  },
  {
    slug: "film-scripts",
    name: "Film & Scripts",
    blurb: "Screenplays, satire, shorts, and stories meant for the screen.",
    tags: ["film", "script", "screenplay", "satire", "short-film"],
    workTypes: ["script"],
    icon: "clapperboard",
  },
  {
    slug: "research-archives",
    name: "Research & Archives",
    blurb: "Field notes, oral histories, journals, and the archives behind them.",
    tags: ["research", "archive", "history", "field-notes", "cities", "memory", "journal"],
    workTypes: ["research", "journal"],
    icon: "archive",
  },
];

export function circleBySlug(slug: string): Circle | undefined {
  return CIRCLES.find((c) => c.slug === slug);
}

export function matchesCircle(circle: Circle, item: { tags: string[]; workType?: string | null }): boolean {
  if (item.workType && (circle.workTypes as string[]).includes(item.workType)) return true;
  const tags = item.tags.map((t) => t.toLowerCase());
  return circle.tags.some((t) => tags.includes(t));
}
