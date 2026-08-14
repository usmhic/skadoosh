import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.MINIO_BUCKET ?? "skaddosh";

function getS3Client() {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) return null;

  return new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
}

function getPublicBase() {
  const endpoint = (process.env.MINIO_ENDPOINT ?? "").replace(/\/$/, "");
  return `${endpoint}/${BUCKET}`;
}

export async function uploadToStorage(
  key: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<string> {
  const s3 = getS3Client();

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${getPublicBase()}/${key}`;
  }

  // Filesystem fallback
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");

  const cwd = process.cwd();
  const root = cwd.endsWith("apps/web")
    ? join(cwd, "public", "uploads")
    : join(cwd, "apps", "web", "public", "uploads");

  const absolutePath = join(root, key);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return `/uploads/${key}`;
}

export async function deleteFromStorage(key: string): Promise<void> {
  const s3 = getS3Client();
  if (s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }
  const { unlink } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const cwd = process.cwd();
  const root = cwd.endsWith("apps/web")
    ? join(cwd, "public", "uploads")
    : join(cwd, "apps", "web", "public", "uploads");
  await unlink(join(root, key)).catch(() => {});
}
