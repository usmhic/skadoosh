"use client";

import { useRef, useState } from "react";
import { CameraIcon, Loader2Icon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@skaddosh/ui/components/ui/avatar";
import { cn } from "@skaddosh/ui/lib/utils";

interface AvatarUploadProps {
  value?: string | null;
  fallback: string;
  onChange: (url: string) => void;
  size?: string;
  className?: string;
}

export function AvatarUpload({ value, fallback, onChange, size = "size-16", className }: AvatarUploadProps) {
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
      fd.append("folder", "avatars");
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

  return (
    <div className={cn("space-y-1.5", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative block rounded-full"
        title="Change avatar"
      >
        <Avatar className={cn(size, "text-base")}>
          {value ? <AvatarImage src={value} alt={fallback} className="object-cover" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{fallback}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
          {uploading ? <Loader2Icon className="size-5 animate-spin" /> : <CameraIcon className="size-5" />}
        </div>
      </button>
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
