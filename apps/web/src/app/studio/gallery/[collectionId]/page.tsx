"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { ConfirmDialog } from "@skaddosh/ui/components/confirm-dialog";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  AccessControlFields,
  type AccessControlValue,
} from "@/components/studio/access-control-fields";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  ImagePlusIcon,
  Loader2Icon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";

interface GalleryImage {
  url: string;
  caption?: string;
  alt?: string;
}

const ACCENT_PRESETS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
];

export default function GalleryEditorPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: collection, isPending } = trpc.gallery.byId.useQuery({
    id: collectionId,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [access, setAccess] = useState<AccessControlValue>({
    visibility: "public",
    unlockMethod: "request",
    kudosPrice: 0,
  });
  const [published, setPublished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editCaption, setEditCaption] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!collection) return;
    setName(collection.name);
    setDescription(collection.description);
    setCoverImage(collection.coverImage ?? null);
    setImages(collection.images as GalleryImage[]);
    setAccentColor(collection.accentColor);
    setAccess({
      visibility: collection.visibility,
      unlockMethod: collection.unlockMethod,
      kudosPrice: collection.kudosPrice,
    });
    setPublished(collection.status === "published");
  }, [collection]);

  const update = trpc.gallery.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      utils.gallery.mine.invalidate();
    },
  });

  const deleteMutation = trpc.gallery.delete.useMutation({
    onSuccess: () => router.push("/studio"),
    onError: (error) => setSaveError(error.message),
  });

  const save = useCallback(
    async (nextPublished?: boolean) => {
      setSaving(true);
      setSaveError("");
      try {
        await update.mutateAsync({
          id: collectionId,
          name: name.trim(),
          description,
          status: (nextPublished ?? published) ? "published" : "draft",
          coverImage: coverImage ?? null,
          images,
          accentColor,
          visibility: access.visibility,
          unlockMethod: access.unlockMethod,
          kudosPrice: access.kudosPrice,
        });
        if (nextPublished !== undefined) setPublished(nextPublished);
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Could not save this collection.",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      collectionId,
      name,
      description,
      published,
      coverImage,
      images,
      accentColor,
      access,
      update,
    ],
  );

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setUploadError(null);
    const newImages: GalleryImage[] = [];
    let failCount = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (images.length + newImages.length >= 80) break;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "gallery");
      try {
        const res = await fetch("/api/uploads/images", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (data.url) {
          newImages.push({ url: data.url, caption: "", alt: file.name });
        } else {
          failCount++;
          if (!newImages.length) setUploadError(data.error ?? "Upload failed.");
        }
      } catch {
        failCount++;
      }
    }
    if (failCount > 0 && newImages.length > 0) {
      setUploadError(
        `${failCount} file${failCount > 1 ? "s" : ""} failed to upload.`,
      );
    } else if (failCount > 0) {
      setUploadError("Upload failed. Check your connection and try again.");
    }
    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (coverImage === images[idx]?.url) setCoverImage(null);
  }

  function updateCaption(idx: number, caption: string) {
    setImages((prev) =>
      prev.map((img, i) => (i === idx ? { ...img, caption } : img)),
    );
  }

  function setCover(url: string) {
    setCoverImage((prev) => (prev === url ? null : url));
  }

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => router.push("/studio")}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="flex-1 border-transparent bg-transparent px-2 text-base font-semibold shadow-none focus-visible:ring-0"
        />

        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground"
          >
            <Link href="/portfolio/edit">
              <ExternalLinkIcon className="size-3.5 mr-1.5" />
              Portfolio
            </Link>
          </Button>
          <Button
            variant={published ? "outline" : "default"}
            size="sm"
            onClick={() => save(!published)}
            disabled={saving}
          >
            {published ? (
              <EyeOffIcon className="size-3.5 mr-1.5" />
            ) : (
              <EyeIcon className="size-3.5 mr-1.5" />
            )}
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="sm"
            onClick={() => save()}
            disabled={saving}
            className={cn(saved && "bg-green-600 hover:bg-green-600")}
          >
            {saving ? (
              <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
            ) : saved ? (
              <CheckIcon className="size-3.5 mr-1.5" />
            ) : (
              <SaveIcon className="size-3.5 mr-1.5" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
          {saveError ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {saveError}
            </div>
          ) : null}
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="gal-desc">Description</Label>
            <textarea
              id="gal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this collection..."
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Accent color */}
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccentColor(c)}
                  className={cn(
                    "size-6 rounded-full border-2 transition-transform",
                    accentColor === c
                      ? "scale-125 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="ml-1 size-6 cursor-pointer rounded border border-input bg-background p-0"
              />
            </div>
          </div>

          {/* Access & pricing */}
          <div className="space-y-2 border-t border-border pt-6">
            <Label className="text-sm font-semibold">Access & pricing</Label>
            <AccessControlFields value={access} onChange={setAccess} />
          </div>

          {/* Photos grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              <span className="text-xs text-muted-foreground">
                {images.length} / 80
              </span>
            </div>

            {/* Drop zone / upload button */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length)
                  uploadFiles(e.dataTransfer.files);
              }}
              className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 transition hover:border-foreground/20 hover:bg-muted/50"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <ImagePlusIcon className="size-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag photos here or{" "}
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Up to 80 images, max 10 MB each
                  </p>
                  {uploadError && (
                    <p className="text-xs text-destructive">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border-2 bg-muted transition",
                      coverImage === img.url
                        ? "border-primary"
                        : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt ?? ""}
                      className="aspect-square w-full object-cover"
                    />

                    {/* Overlay controls */}
                    <div className="absolute inset-0 flex flex-col items-end justify-between bg-gradient-to-b from-black/45 via-transparent to-black/55 p-2 opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCover(img.url)}
                          aria-label={
                            coverImage === img.url
                              ? `Remove image ${idx + 1} as cover`
                              : `Set image ${idx + 1} as cover`
                          }
                          title={
                            coverImage === img.url
                              ? "Remove cover"
                              : "Set as cover"
                          }
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-semibold transition",
                            coverImage === img.url
                              ? "bg-primary text-primary-foreground"
                              : "bg-background/80 text-foreground",
                          )}
                        >
                          Cover
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label={`Remove image ${idx + 1}`}
                          className="flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>

                      {/* Caption */}
                      {editCaption === idx ? (
                        <Input
                          value={img.caption ?? ""}
                          onChange={(e) => updateCaption(idx, e.target.value)}
                          onBlur={() => setEditCaption(null)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && setEditCaption(null)
                          }
                          autoFocus
                          placeholder="Caption…"
                          className="h-7 text-xs"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditCaption(idx)}
                          className="w-full truncate rounded bg-background/60 px-2 py-1 text-left text-[0.65rem] text-foreground/80"
                        >
                          {img.caption || "Add caption…"}
                        </button>
                      )}
                    </div>

                    {coverImage === img.url && (
                      <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold text-primary-foreground">
                        Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="border-t border-border pt-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              <TrashIcon className="size-4 mr-1.5" />
              Delete collection
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3 sm:hidden">
        <Button
          variant={published ? "outline" : "default"}
          size="sm"
          onClick={() => save(!published)}
          disabled={saving}
        >
          {published ? "Unpublish" : "Publish"}
        </Button>
        <Button
          size="sm"
          onClick={() => save()}
          disabled={saving}
          className={cn(saved && "bg-green-600 hover:bg-green-600")}
        >
          {saving ? (
            <Loader2Icon className="size-4 mr-1.5 animate-spin" />
          ) : saved ? (
            <CheckIcon className="size-4 mr-1.5" />
          ) : (
            <SaveIcon className="size-4 mr-1.5" />
          )}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this collection?"
        description={`“${name || "Untitled collection"}” and its gallery content will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete collection"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate({ id: collectionId })}
      />
    </div>
  );
}
