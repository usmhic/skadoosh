"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { ImageUpload } from "@/components/studio/image-upload";
import type { AiUsage } from "@skaddosh/db/schema";
import {
  AccessControlFields,
  type AccessControlValue,
} from "@/components/studio/access-control-fields";
import {
  BackingTermsFields,
  HumanMadeFields,
  OpenRolesField,
  ProjectLifecycle,
  type BackingTerms,
  type OpenRole,
} from "@/components/studio/project-kudos-fields";
import {
  CollaboratorsPanel,
  LicensingPanel,
  MediumPicker,
} from "@/components/studio/project-ownership-panels";
import type { Medium } from "@skaddosh/db/schema";
import { Button } from "@skaddosh/ui/components/ui/button";
import { ConfirmDialog } from "@skaddosh/ui/components/confirm-dialog";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";

const ACCENT_PRESETS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
];

export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: project, isPending, refetch } = trpc.projects.byId.useQuery({
    id: projectId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [medium, setMedium] = useState<Medium>("other");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [access, setAccess] = useState<AccessControlValue>({
    visibility: "public",
    unlockMethod: "request",
    kudosPrice: 0,
  });
  const [published, setPublished] = useState(false);
  const [pitch, setPitch] = useState("");
  const [terms, setTerms] = useState<BackingTerms>({ backingGoal: 0, backerSharePercent: 10, returnCapPercent: 200 });
  const [openRoles, setOpenRoles] = useState<OpenRole[]>([]);
  const [aiUsage, setAiUsage] = useState<string[]>([]);
  const [humanMade, setHumanMade] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Initialise the form once per project. Later refetches (after saving milestones, posting an
  // update, or changing stage) must not overwrite edits the creator hasn't saved yet.
  const initialisedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!project || initialisedFor.current === project.id) return;
    initialisedFor.current = project.id;
    setTitle(project.title);
    setDescription(project.description);
    setCoverImage(project.coverImage ?? null);
    setImages(project.images);
    setUrl(project.url ?? "");
    setRepoUrl(project.repoUrl ?? "");
    setTags(project.tags);
    setMedium(project.medium as Medium);
    setAccentColor(project.accentColor);
    setAccess({
      visibility: project.visibility,
      unlockMethod: project.unlockMethod,
      kudosPrice: project.kudosPrice,
    });
    setPublished(project.status === "published");
    setPitch(project.pitch);
    setTerms({
      backingGoal: project.backingGoal,
      backerSharePercent: project.backerSharePercent,
      returnCapPercent: project.returnCapPercent,
    });
    setOpenRoles(project.openRoles);
    setAiUsage(project.aiUsage);
    setHumanMade(Boolean(project.humanMadeConfirmedAt));
  }, [project]);

  const update = trpc.projects.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      utils.projects.mine.invalidate();
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => router.push("/studio"),
    onError: (error) => setSaveError(error.message),
  });

  const save = useCallback(
    async (nextPublished?: boolean) => {
      setSaving(true);
      setSaveError("");
      try {
        await update.mutateAsync({
          id: projectId,
          title: title.trim(),
          description,
          status: (nextPublished ?? published) ? "published" : "draft",
          coverImage: coverImage ?? null,
          images,
          url: url.trim() || null,
          repoUrl: repoUrl.trim() || null,
          tags,
          medium,
          accentColor,
          visibility: access.visibility,
          unlockMethod: access.unlockMethod,
          kudosPrice: access.kudosPrice,
          pitch: pitch.trim(),
          ...terms,
          openRoles: openRoles.filter((role) => role.title.trim()),
          aiUsage: aiUsage as AiUsage[],
          humanMadeConfirmed: humanMade,
        });
        if (nextPublished !== undefined) setPublished(nextPublished);
        await refetch();
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Could not save this project.",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      projectId,
      title,
      description,
      published,
      coverImage,
      images,
      url,
      repoUrl,
      tags,
      medium,
      accentColor,
      access,
      update,
      pitch,
      terms,
      openRoles,
      aiUsage,
      humanMade,
      refetch,
    ],
  );

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function addImage(url: string | null) {
    if (url) setImages((prev) => [...prev, url]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="flex-1 border-transparent bg-transparent px-2 text-base font-semibold shadow-none focus-visible:ring-0"
        />

        <div className="hidden items-center gap-2 sm:flex">
          {published ? (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/projects/${projectId}`}>
                <ExternalLinkIcon className="size-3.5 mr-1.5" />
                View page
              </Link>
            </Button>
          ) : null}
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
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
          {saveError ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {saveError}
            </div>
          ) : null}
          {/* Cover image */}
          <div className="space-y-2">
            <Label>Cover image</Label>
            <ImageUpload
              value={coverImage}
              onChange={setCoverImage}
              folder="projects"
              label="Upload cover image"
              aspectRatio="16/9"
            />
          </div>

          {/* Pitch */}
          <div className="space-y-2">
            <Label htmlFor="proj-pitch">One-line pitch</Label>
            <Input
              id="proj-pitch"
              value={pitch}
              maxLength={160}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="A hand-drawn atlas of Morocco's old salt roads."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="proj-desc">Story</Label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              placeholder="What are you making, why, and what will backing pay for?"
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proj-url">Live URL</Label>
              <Input
                id="proj-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-repo">Repository URL</Label>
              <Input
                id="proj-repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                type="url"
              />
            </div>
          </div>

          <MediumPicker value={medium} onChange={setMedium} />

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addTag}
                type="button"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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

          {/* Kudos & backing */}
          <div className="space-y-6 border-t border-border pt-6">
            <div>
              <h2 className="font-display text-xl font-semibold">Kudos & backing</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How supporters can back this project, and how you deliver it in public.
              </p>
            </div>
            <BackingTermsFields
              value={terms}
              onChange={setTerms}
              backersCount={project?.backersCount ?? 0}
              locked={{
                backingGoal: project?.backingGoal ?? 0,
                backerSharePercent: project?.backerSharePercent ?? 0,
                returnCapPercent: project?.returnCapPercent ?? 100,
              }}
            />
            {project ? (
              <ProjectLifecycle
                projectId={projectId}
                stage={project.stage}
                milestones={project.milestones}
                published={published}
                onChanged={() => void refetch()}
              />
            ) : null}
          </div>

          {/* Collaboration */}
          <div className="border-t border-border pt-6">
            <OpenRolesField value={openRoles} onChange={setOpenRoles} />
          </div>

          <CollaboratorsPanel projectId={projectId} published={published} />

          <LicensingPanel projectId={projectId} />

          {/* Originality */}
          <HumanMadeFields
            aiUsage={aiUsage}
            onAiUsageChange={setAiUsage}
            confirmed={humanMade}
            onConfirmedChange={setHumanMade}
          />

          {/* Additional images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Screenshots / additional images</Label>
              <span className="text-xs text-muted-foreground">
                {images.length} / 20
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label={`Remove image ${idx + 1}`}
                    className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))}
              {images.length < 20 && (
                <ImageUpload
                  value={null}
                  onChange={addImage}
                  folder="projects"
                  label="Add image"
                  aspectRatio="16/9"
                  className="col-span-1"
                />
              )}
            </div>
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
              Delete project
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
        title="Delete this project?"
        description={`“${title || "Untitled project"}” will be permanently removed. Any Cold Kudos still locked go back to their backers first. This cannot be undone.`}
        confirmLabel="Delete project"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate({ id: projectId })}
      />
    </div>
  );
}
