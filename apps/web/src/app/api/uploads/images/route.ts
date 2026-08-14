import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@skaddosh/auth/server";
import { db, portfolioProfiles } from "@skaddosh/db";
import { uploadToStorage } from "@/lib/storage";

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? "10", 10);
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

// Maps accepted MIME types to their canonical file extension.
// Extend here to allow new formats — the check below rejects everything else.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file     = formData.get("file");
  const folder   = sanitizeSegment(String(formData.get("folder") || "portfolio"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP, HEIC or HEIF images allowed." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `Image is too large. Max size is ${MAX_SIZE_MB} MB.` }, { status: 400 });
  }

  const [profile] = await db
    .select({ username: portfolioProfiles.username })
    .from(portfolioProfiles)
    .where(eq(portfolioProfiles.userId, session.user.id))
    .limit(1);

  const username = sanitizeSegment(profile?.username || session.user.name || session.user.email);
  const month    = new Date().toISOString().slice(0, 7);
  const key      = `${username || "shared"}/${folder}/${month}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const url    = await uploadToStorage(key, buffer, file.type);

  return NextResponse.json({ url, key });
}
