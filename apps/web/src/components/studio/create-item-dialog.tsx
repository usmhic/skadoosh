"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@skaddosh/ui/components/ui/dialog";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  BookOpenIcon,
  FolderOpenIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  ArrowLeftIcon,
} from "lucide-react";

type ContentType = "article" | "project" | "gallery";
const WRITING_TYPES = ["article", "essay", "story", "poem", "journal", "script", "novel"] as const;
type WritingType = (typeof WRITING_TYPES)[number];

const CONTENT_TYPES: Array<{
  id: ContentType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> = [
  { id: "article", icon: BookOpenIcon, label: "Article", description: "Write and publish a piece" },
  { id: "project", icon: FolderOpenIcon, label: "Project", description: "Showcase a project or work" },
  { id: "gallery", icon: ImageIcon, label: "Gallery", description: "Create a photo collection" },
];

const ACCENT_PRESETS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
];

function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {ACCENT_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-6 rounded-full border-2 transition-transform",
            value === c ? "scale-125 border-foreground" : "border-transparent",
          )}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-1 size-6 cursor-pointer rounded border border-input bg-background p-0"
        aria-label="Custom color"
      />
    </div>
  );
}

export function CreateItemDialog({
  open,
  onOpenChange,
  initialType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: ContentType;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const [step, setStep] = useState<"pick" | ContentType>(initialType ?? "pick");
  const [writingType, setWritingType] = useState<WritingType>("article");
  const [title, setTitle] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [error, setError] = useState<string | null>(null);

  const createWork = trpc.works.create.useMutation({
    onSuccess: ({ id }) => {
      close();
      router.push(`/studio/works/${id}?lang=${lang}`);
    },
    onError: (error) => setError(error.message),
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: ({ id }) => {
      close();
      router.push(`/studio/projects/${id}`);
    },
    onError: (error) => setError(error.message),
  });

  const createGallery = trpc.gallery.create.useMutation({
    onSuccess: ({ id }) => {
      close();
      router.push(`/studio/gallery/${id}`);
    },
    onError: (error) => setError(error.message),
  });

  const isPending =
    createWork.isPending || createProject.isPending || createGallery.isPending;

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setStep(initialType ?? "pick");
      setTitle("");
      setAccentColor("#6366f1");
      setWritingType("article");
      setError(null);
    }, 200);
  }

  function handleCreate() {
    setError(null);
    if (step === "article") {
      createWork.mutate({ type: writingType, accentColor });
    } else if (step === "project") {
      createProject.mutate({ title: title.trim(), accentColor });
    } else if (step === "gallery") {
      createGallery.mutate({ name: title.trim(), accentColor });
    }
  }

  const stepLabel: Record<ContentType, string> = {
    article: "New article",
    project: "New project",
    gallery: "New gallery",
  };

  const stepHint: Record<ContentType, string> = {
    article: "Pick a writing type — everything else is set in the editor.",
    project: "Give it a name — you can fill in all details in the editor.",
    gallery: "Name your collection — add photos in the editor.",
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {step === "pick" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create something new</DialogTitle>
              <DialogDescription>What would you like to add?</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2.5 py-1">
              {CONTENT_TYPES.map(({ id, icon: Icon, label, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStep(id)}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{stepLabel[step]}</DialogTitle>
              <DialogDescription>{stepHint[step]}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-1">
              {step === "article" ? (
                <div className="space-y-2">
                  <Label>Writing type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WRITING_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setWritingType(t)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                          t === writingType
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="cid-title">
                    {step === "project" ? "Project name" : "Collection name"}
                  </Label>
                  <Input
                    id="cid-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={step === "project" ? "My project" : "Collection name"}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && !isPending && handleCreate()}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Accent color</Label>
                <AccentPicker value={accentColor} onChange={setAccentColor} />
              </div>

              {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                  {error.toLowerCase().includes("username") ? (
                    <>
                      {" "}
                      <Link href="/settings" className="font-semibold underline underline-offset-2" onClick={close}>
                        Go to settings
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep("pick")}
                disabled={isPending}
                className="shrink-0"
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={isPending}>
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Create
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
