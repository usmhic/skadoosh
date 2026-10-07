import { AI_USAGE, type AiUsage, type Project } from "@skaddosh/db";
import type { ProjectStage } from "./kudos-economy";

export type OpenRole = { title: string; description: string };

function parseJsonArray<T>(value: string, guard: (item: unknown) => item is T): T[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

export const isString = (item: unknown): item is string => typeof item === "string";

export const isOpenRole = (item: unknown): item is OpenRole =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as OpenRole).title === "string" &&
  typeof (item as OpenRole).description === "string";

export const isAiUsage = (item: unknown): item is AiUsage =>
  typeof item === "string" && (AI_USAGE as readonly string[]).includes(item);

export function parseAiUsage(value: string): AiUsage[] {
  return parseJsonArray(value, isAiUsage);
}

export function parseOpenRoles(value: string): OpenRole[] {
  return parseJsonArray(value, isOpenRole);
}

/** Card-sized public view of a project, shared by Discover, profiles, and circles. */
export function projectCard(
  p: Project,
  creator: { name: string; username: string | null; image?: string | null },
) {
  return {
    kind: "project" as const,
    id: p.id,
    title: p.title,
    pitch: p.pitch || p.description.slice(0, 160),
    coverImage: p.coverImage,
    accentColor: p.accentColor,
    stage: p.stage as ProjectStage,
    tags: parseJsonArray(p.tags, isString),
    backingGoal: p.backingGoal,
    coldKudosTotal: p.coldKudosTotal,
    backersCount: p.backersCount,
    kudosReceived: p.kudosReceived,
    openRoles: parseOpenRoles(p.openRolesJson).length,
    confidential: p.visibility === "confidential",
    creator: { name: creator.name, username: creator.username, image: creator.image ?? null },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type ProjectCard = ReturnType<typeof projectCard>;
