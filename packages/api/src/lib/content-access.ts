import { and, eq } from "drizzle-orm";
import { db, contentAccess } from "@skaddosh/db";

export type LockableContentType = "work" | "project" | "gallery";

export async function hasContentAccess(
  contentType: LockableContentType,
  contentId: string,
  viewerId: string | null | undefined,
): Promise<boolean> {
  if (!viewerId) return false;
  const [grant] = await db
    .select()
    .from(contentAccess)
    .where(
      and(
        eq(contentAccess.contentType, contentType),
        eq(contentAccess.contentId, contentId),
        eq(contentAccess.userId, viewerId),
      ),
    )
    .limit(1);
  return grant?.status === "granted" || grant?.status === "approved";
}

export function canViewFull(
  row: { visibility: string; creatorId: string },
  viewerId: string | null | undefined,
): boolean {
  return row.visibility !== "confidential" || row.creatorId === viewerId;
}
