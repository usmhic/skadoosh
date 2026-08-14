"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
  aspectRatio?: "16/9" | "1/1" | "4/3";
}

export function ImageUpload({
  value,
  onChange,
  folder = "studio",
  label = "Upload image",
  className,
  aspectRatio = "16/9",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only images are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Max 10 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/uploads/images", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass =
    aspectRatio === "1/1" ? "aspect-square" : aspectRatio === "4/3" ? "aspect-[4/3]" : "aspect-video";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-muted/40",
          aspectClass,
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Uploaded" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 transition-opacity hover:opacity-100">
              <Button
                variant="secondary"
                size="icon"
                className="size-7 rounded-full shadow-sm"
                onClick={() => onChange(null)}
                type="button"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground transition hover:text-foreground"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2Icon className="size-5 animate-spin" />
            ) : (
              <>
                <ImageIcon className="size-5" />
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </button>
        )}
      </div>

      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          type="button"
          disabled={uploading}
        >
          {uploading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Replace image
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
