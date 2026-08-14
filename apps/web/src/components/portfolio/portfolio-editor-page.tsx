"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { PortfolioView, type PortfolioViewProfile } from "@/components/portfolio/portfolio-view";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@skaddosh/ui/components/ui/card";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  BarChart3Icon,
  BookOpenIcon,
  BookOpenTextIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FolderOpenIcon,
  ImageIcon,
  Loader2Icon,
  LayersIcon,
  PlusIcon,
  SaveIcon,
  SettingsIcon,
  TrashIcon,
  UserRoundIcon,
} from "lucide-react";

export type EditablePortfolio = PortfolioViewProfile & {
  published: boolean;
  inbox?: Array<{
    id: string;
    kind: "access_request" | "contact";
    createdAt: number;
    read: boolean;
    subject: string;
    from: { name: string; email: string; phone?: string; company?: string };
    body: string;
    meta?: Record<string, string>;
  }>;
};

type EditorTab = "settings" | "identity" | "content" | "story" | "analytics";
type ProfileType = "individual" | "team" | "studio" | "company" | "community";
type PortfolioSection = "about" | "articles" | "projects" | "gallery" | "contact";

const profileTypes: ProfileType[] = ["individual", "team", "studio", "company", "community"];
const portfolioSections: Array<{ value: PortfolioSection; label: string }> = [
  { value: "about", label: "About" },
  { value: "articles", label: "Articles" },
  { value: "projects", label: "Projects" },
  { value: "gallery", label: "Gallery" },
  { value: "contact", label: "Contact" },
];
const normalizeProfileType = (value?: string): ProfileType =>
  profileTypes.includes(value as ProfileType) ? value as ProfileType : "individual";

const tabs: Array<{ value: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "settings", label: "General", icon: SettingsIcon },
  { value: "identity", label: "Identity", icon: UserRoundIcon },
  { value: "content", label: "Content", icon: LayersIcon },
  { value: "story", label: "Experience", icon: BookOpenTextIcon },
  { value: "analytics", label: "Analytics", icon: BarChart3Icon },
];

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function joinCsv(value?: string[]) {
  return (value ?? []).join(", ");
}

function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  folder,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  folder: string;
  placeholder?: string;
}) {
  const [uploadState, setUploadState] = useState("");

  const upload = async (file: File) => {
    setUploadState("Uploading...");
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const response = await fetch("/api/uploads/images", {
      method: "POST",
      body: form,
    });
    const payload = await response.json() as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Upload failed.");
    }

    onChange(payload.url);
    setUploadState("Uploaded");
  };

  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} placeholder={placeholder} />
      <Input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          upload(file).catch((error) => {
            setUploadState(error instanceof Error ? error.message : "Upload failed.");
          }).finally(() => {
            event.currentTarget.value = "";
          });
        }}
      />
      {uploadState ? <p className="text-xs text-muted-foreground">{uploadState}</p> : null}
    </div>
  );
}

// ── Content highlighting picker ─────────────────────────────────────────────

function SelectableCard({
  selected,
  onToggle,
  accent,
  title,
  meta,
  coverImage,
  badge,
  studioHref,
}: {
  selected: boolean;
  onToggle: () => void;
  accent: string;
  title: string;
  meta: string;
  coverImage?: string | null;
  badge?: string;
  studioHref: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-4 transition",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/30",
      )}
    >
      <div className="size-2.5 shrink-0 rounded-full" style={{ background: accent }} />

      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <span className="text-[0.6rem] text-muted-foreground">No img</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>

      {badge && (
        <Badge variant="outline" className="shrink-0 text-[0.6rem]">
          {badge}
        </Badge>
      )}

      <Link
        href={studioHref}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        title="Edit in studio"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLinkIcon className="size-3.5" />
      </Link>

      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:border-foreground/30",
        )}
      >
        {selected && <CheckIcon className="size-3.5" />}
      </button>
    </div>
  );
}

function ContentPickerCard({
  title,
  description,
  emptyIcon: EmptyIcon,
  emptyLabel,
  items,
}: {
  title: string;
  description: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
  items: React.ReactNode[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <EmptyIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/studio">Manage in Studio</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PortfolioEditorPage({ usernameHint }: { usernameHint?: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const utils = trpc.useUtils();
  const { data, isPending, error, refetch } = trpc.portfolios.mine.useQuery(undefined, { enabled: !!session });
  const { data: analytics } = trpc.portfolios.analyticsMine.useQuery(undefined, { enabled: !!session });
  const savePortfolio = trpc.portfolios.saveMine.useMutation({
    onSuccess: async (saved) => {
      setDraft((current) => current ? { ...current, ...saved, inbox: current.inbox } : current);
      setSaveState("Saved");
      await utils.portfolios.mine.invalidate();
      await utils.portfolios.byUsername.invalidate();
    },
    onError: (error) => setSaveState(error.message),
  });
  const [draft, setDraft] = useState<EditablePortfolio | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("settings");
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    if (!sessionPending && !session) router.push("/auth/login");
  }, [router, session, sessionPending]);

  useEffect(() => {
    if (!data?.portfolio) return;
    setDraft({
      ...(data.portfolio as EditablePortfolio),
      works: data.works,
      username: data.exists ? data.portfolio.username : usernameHint || data.portfolio.username,
      premium: data.premium,
      published: data.portfolio.published,
    });
  }, [data, usernameHint]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Portfolio could not load</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => void refetch()}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionPending || isPending || !session || !draft) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <PortfolioEditorSkeleton />
      </div>
    );
  }

  const content = draft.content;
  const customDomainTarget = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://skaddosh").hostname;
    } catch {
      return "skaddosh";
    }
  })();
  const updateDraft = (patch: Partial<EditablePortfolio>) =>
    setDraft((current) => current ? { ...current, ...patch } : current);
  const updateContent = (patch: Partial<EditablePortfolio["content"]>) =>
    updateDraft({ content: { ...content, ...patch } });
  const updateSiteConfig = (patch: Partial<EditablePortfolio["content"]["siteConfig"]>) =>
    updateContent({ siteConfig: { ...content.siteConfig, ...patch } });

  const highlighting = content.highlighting;
  const toggleHighlight = (kind: "workIds" | "projectIds" | "galleryIds", id: string) => {
    const current = highlighting[kind];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateContent({ highlighting: { ...highlighting, [kind]: next } });
  };

  const save = (nextPublished?: boolean) => {
    setSaveState("");
    savePortfolio.mutate({
      username: draft.username,
      displayName: draft.displayName,
      prompt: draft.prompt,
      profileType: normalizeProfileType(draft.profileType),
      published: nextPublished ?? draft.published,
      customization: {
        themePreset: draft.customization.themePreset ?? "skaddosh",
        accentColor: draft.customization.accentColor ?? "#18181b",
        headingFont: draft.customization.headingFont ?? "Spectral",
        monoFont: draft.customization.monoFont ?? "Geist Mono",
        heroAlignment: draft.customization.heroAlignment ?? "left",
        sectionSpacing: draft.customization.sectionSpacing ?? "balanced",
        cardStyle: draft.customization.cardStyle ?? "soft",
        visibleSections: portfolioSections.map((section) => section.value),
        customDomainRequested: Boolean(draft.customization.customDomainRequested),
        customDomain: draft.customization.customDomain ?? "",
      },
      content: draft.content,
    });
  };

  const viewHref = `/portfolio/${draft.username}`;
  const works = data?.works ?? [];
  const projects = data?.projects ?? [];
  const gallery = data?.gallery ?? [];

  // Mirrors the server-side filtering in portfolios.byUsername, so the live
  // preview shows exactly what a saved+published portfolio would show.
  const previewWorks = highlighting.workIds.length
    ? works.filter((w) => highlighting.workIds.includes(w.id))
    : works;
  const previewProjects = projects
    .filter((p) => p.status === "published")
    .filter((p) => !highlighting.projectIds.length || highlighting.projectIds.includes(p.id));
  const previewGallery = gallery
    .filter((g) => g.status === "published")
    .filter((g) => !highlighting.galleryIds.length || highlighting.galleryIds.includes(g.id));

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background">
      <Header />
      <div className="shrink-0 border-b border-border bg-background/95 px-4 py-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Portfolio Studio</h1>
              <Badge variant={draft.published ? "default" : "outline"}>
                {draft.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              skaddosh{viewHref}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={viewHref}>
                <EyeIcon className="size-4" />
                Open Portfolio
              </Link>
            </Button>
            <Button
              variant={draft.published ? "outline" : "default"}
              onClick={() => save(!draft.published)}
              disabled={savePortfolio.isPending}
            >
              {draft.published ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              {draft.published ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={() => save()} disabled={savePortfolio.isPending}>
              {savePortfolio.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Save Portfolio
            </Button>
          </div>
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <div className="grid h-full min-h-0 w-full gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)]">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm">
            <div className="shrink-0 border-b border-border bg-background/60 p-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {tabs.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveTab(value)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition",
                      activeTab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {activeTab === "settings" ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>General portfolio information</CardTitle>
                      <CardDescription>Store the public route, profile type, and top-level promise.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Portfolio URL" value={draft.username} onChange={(username) => updateDraft({ username })} />
                        <Field label="Display name" value={draft.displayName} onChange={(displayName) => updateDraft({ displayName })} />
                        <SelectField
                          label="Profile type"
                          value={normalizeProfileType(draft.profileType)}
                          options={profileTypes}
                          onChange={(profileType) => updateDraft({ profileType })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Portfolio promise</Label>
                        <TextArea value={draft.prompt} onChange={(prompt) => updateDraft({ prompt })} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3">
                        <Badge variant={draft.published ? "default" : "outline"} className="gap-1">
                          {draft.published ? <CheckIcon className="size-3" /> : <EyeOffIcon className="size-3" />}
                          {draft.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {draft.published
                            ? "Your portfolio is live at the URL above."
                            : "Your portfolio is hidden until you publish it."}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Theme</CardTitle>
                      <CardDescription>Keep the page aligned with skaddosh while still giving the portfolio its own signal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Accent</Label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={draft.customization.accentColor || "#18181b"}
                              onChange={(event) => updateDraft({ customization: { ...draft.customization, accentColor: event.target.value } })}
                              className="h-9 w-12 rounded-md border border-input bg-background"
                            />
                            <Input
                              value={draft.customization.accentColor || "#18181b"}
                              onChange={(event) => updateDraft({ customization: { ...draft.customization, accentColor: event.target.value } })}
                            />
                          </div>
                        </div>
                        <SelectField
                          label="Hero alignment"
                          value={draft.customization.heroAlignment || "left"}
                          options={["left", "center"]}
                          onChange={(heroAlignment) => updateDraft({ customization: { ...draft.customization, heroAlignment: heroAlignment as "left" | "center" } })}
                        />
                        <SelectField
                          label="Section spacing"
                          value={draft.customization.sectionSpacing || "balanced"}
                          options={["compact", "balanced", "airy"]}
                          onChange={(sectionSpacing) => updateDraft({ customization: { ...draft.customization, sectionSpacing: sectionSpacing as "compact" | "balanced" | "airy" } })}
                        />
                        <SelectField
                          label="Card style"
                          value={draft.customization.cardStyle || "soft"}
                          options={["soft", "outline", "elevated"]}
                          onChange={(cardStyle) => updateDraft({ customization: { ...draft.customization, cardStyle: cardStyle as "soft" | "outline" | "elevated" } })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Custom domain</CardTitle>
                      <CardDescription>Connect a hostname while keeping the portfolio managed inside skaddosh.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
                        Save the hostname here, create a CNAME record pointing to {customDomainTarget}, then request activation.
                      </div>
                      <Field
                        label="Custom hostname"
                        value={draft.customization.customDomain || ""}
                        placeholder="portfolio.example.com"
                        onChange={(customDomain) => updateDraft({
                          customization: {
                            ...draft.customization,
                            customDomain,
                            customDomainRequested: Boolean(customDomain && draft.customization.customDomainRequested),
                          },
                        })}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.customization.customDomainRequested)}
                          disabled={!draft.customization.customDomain}
                          onChange={(event) => updateDraft({
                            customization: {
                              ...draft.customization,
                              customDomainRequested: event.target.checked,
                            },
                          })}
                        />
                        Request activation for this custom domain
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Public subdomains also work: use username.{customDomainTarget} for a direct portfolio address.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {activeTab === "identity" ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Identity</CardTitle>
                      <CardDescription>Personal information, social links, and hero media.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" value={content.siteConfig.firstName} onChange={(firstName) => updateSiteConfig({ firstName, name: `${firstName} ${content.siteConfig.lastName}`.trim() })} />
                        <Field label="Last name" value={content.siteConfig.lastName} onChange={(lastName) => updateSiteConfig({ lastName, name: `${content.siteConfig.firstName} ${lastName}`.trim() })} />
                        <Field label="Initials" value={content.siteConfig.initials} onChange={(initials) => updateSiteConfig({ initials })} />
                        <Field label="Location" value={content.siteConfig.location} onChange={(location) => updateSiteConfig({ location })} />
                        <Field label="Email" value={content.siteConfig.email} onChange={(email) => updateSiteConfig({ email })} />
                        <Field label="Phone" value={content.siteConfig.phone} onChange={(phone) => updateSiteConfig({ phone })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tagline</Label>
                        <TextArea value={content.siteConfig.tagline} onChange={(tagline) => updateSiteConfig({ tagline })} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(["github", "linkedin", "instagram"] as const).map((key) => (
                          <Field
                            key={key}
                            label={`${key[0]?.toUpperCase()}${key.slice(1)} URL`}
                            value={content.siteConfig.social[key]}
                            onChange={(value) => updateSiteConfig({ social: { ...content.siteConfig.social, [key]: value } })}
                          />
                        ))}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <ImageField label="Hero image URL" folder="hero" value={content.heroImage.url} onChange={(url) => updateContent({ heroImage: { ...content.heroImage, url } })} />
                        <Field label="Hero alt text" value={content.heroImage.alt} onChange={(alt) => updateContent({ heroImage: { ...content.heroImage, alt } })} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {activeTab === "content" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose which published Studio content to feature on your portfolio&apos;s Articles, Projects, and Gallery sections.
                  </p>

                  <ContentPickerCard
                    title={`Articles${highlighting.workIds.length ? ` (${highlighting.workIds.length})` : ""}`}
                    description="Choose which published articles to highlight."
                    emptyIcon={BookOpenIcon}
                    emptyLabel="No published articles yet."
                    items={works.map((w) => {
                      const title =
                        (w.title as Record<string, string>).en ||
                        (w.title as Record<string, string>).ar ||
                        "Untitled";
                      return (
                        <SelectableCard
                          key={w.id}
                          selected={highlighting.workIds.includes(w.id)}
                          onToggle={() => toggleHighlight("workIds", w.id)}
                          accent={w.accentColor ?? "#6366f1"}
                          title={title}
                          meta={`${w.type} · ${w.kudosCount} kudos`}
                          studioHref={`/studio/works/${w.id}`}
                        />
                      );
                    })}
                  />

                  <ContentPickerCard
                    title={`Projects${highlighting.projectIds.length ? ` (${highlighting.projectIds.length})` : ""}`}
                    description="Choose which projects to highlight."
                    emptyIcon={FolderOpenIcon}
                    emptyLabel="No projects yet."
                    items={projects.map((p) => (
                      <SelectableCard
                        key={p.id}
                        selected={highlighting.projectIds.includes(p.id)}
                        onToggle={() => toggleHighlight("projectIds", p.id)}
                        accent={p.accentColor}
                        title={p.title || "Untitled project"}
                        meta={p.tags.join(", ") || "No tags"}
                        coverImage={p.coverImage}
                        badge={p.status === "published" ? "Published" : "Draft"}
                        studioHref={`/studio/projects/${p.id}`}
                      />
                    ))}
                  />

                  <ContentPickerCard
                    title={`Gallery${highlighting.galleryIds.length ? ` (${highlighting.galleryIds.length})` : ""}`}
                    description="Choose which gallery collections to highlight."
                    emptyIcon={ImageIcon}
                    emptyLabel="No gallery collections yet."
                    items={gallery.map((g) => (
                      <SelectableCard
                        key={g.id}
                        selected={highlighting.galleryIds.includes(g.id)}
                        onToggle={() => toggleHighlight("galleryIds", g.id)}
                        accent={g.accentColor}
                        title={g.name || "Untitled collection"}
                        meta={`${g.imageCount} photo${g.imageCount !== 1 ? "s" : ""}`}
                        coverImage={g.coverImage}
                        badge={g.status === "published" ? "Published" : "Draft"}
                        studioHref={`/studio/gallery/${g.id}`}
                      />
                    ))}
                  />
                </div>
              ) : null}

              {activeTab === "story" ? (
                <StoryEditor draft={draft} setDraft={setDraft} />
              ) : null}

              {activeTab === "analytics" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Views", value: analytics?.totals.views ?? 0 },
                      { label: "Clicks", value: analytics?.totals.clicks ?? 0 },
                      { label: "Visitors", value: analytics?.totals.uniqueVisitors ?? 0 },
                    ].map((item) => (
                      <Card key={item.label}>
                        <CardContent className="py-5">
                          <p className="text-3xl font-semibold">{item.value}</p>
                          <p className="text-xs text-muted-foreground">{item.label} in the last 30 days</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(analytics?.topActions ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No clicks yet.</p>
                      ) : analytics?.topActions.map((action) => (
                        <div key={action.name} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                          <span>{action.name}</span>
                          <Badge variant="secondary">{action.total}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border bg-background/80 px-4 py-3">
              <div className="flex min-h-5 items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{saveState}</span>
                <span className="text-muted-foreground">Changes are local until saved.</span>
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm xl:block">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-border bg-background/60 px-4 py-3">
                <p className="text-sm font-medium">Live preview</p>
                <p className="text-xs text-muted-foreground">The right pane uses the same public renderer as Open Portfolio.</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PortfolioView
                  profile={{ ...draft, works: previewWorks, projects: previewProjects, gallery: previewGallery }}
                  editHref="/portfolio/edit"
                  framed
                  preview
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PortfolioEditorSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-background/95 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-44 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
      <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-3 rounded-xl border border-border bg-background p-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-5 h-9 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function StoryEditor({
  draft,
  setDraft,
}: {
  draft: EditablePortfolio;
  setDraft: React.Dispatch<React.SetStateAction<EditablePortfolio | null>>;
}) {
  const content = draft.content;
  const setContent = (patch: Partial<EditablePortfolio["content"]>) =>
    setDraft((current) => current ? { ...current, content: { ...current.content, ...patch } } : current);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Experience and about story</CardTitle>
          <CardDescription>Add experience, milestones, and the narrative spine of the portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Who title" value={content.aboutStory.whoAmI.title} onChange={(title) => setContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, title } } })} />
          <div className="space-y-2">
            <Label>Who body</Label>
            <TextArea value={content.aboutStory.whoAmI.body} onChange={(body) => setContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, body } } })} />
          </div>
          <Field label="What I do title" value={content.aboutStory.whatIDo.title} onChange={(title) => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, title } } })} />
          <div className="space-y-2">
            <Label>What I do body</Label>
            <TextArea value={content.aboutStory.whatIDo.body} onChange={(body) => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, body } } })} />
          </div>
        </CardContent>
      </Card>

      <RepeaterCard
        title="Experience and education"
        description="Roles, studies, awards, milestones, and shipped work."
        items={content.timeline}
        onAdd={() => setContent({ timeline: [{ id: `t-${Date.now()}`, year: "2026", type: "academic", title: "New experience", org: "", description: "", tags: [] }, ...content.timeline] })}
        renderItem={(item, index) => (
          <div key={item.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{item.type}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setContent({ timeline: content.timeline.filter((_, i) => i !== index) })}>
                <TrashIcon className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Year" value={item.year} onChange={(year) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, year } : entry) })} />
              <SelectField label="Type" value={item.type} options={["work", "academic", "project", "award"]} onChange={(type) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, type: type as "work" | "academic" | "project" | "award" } : entry) })} />
              <Field label="Title" value={item.title} onChange={(title) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, title } : entry) })} />
            </div>
            <Field label="Organization" value={item.org} onChange={(org) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, org } : entry) })} />
            <div className="space-y-2">
              <Label>Description</Label>
              <TextArea value={item.description} onChange={(description) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, description } : entry) })} />
            </div>
            <Field label="Tags" value={joinCsv(item.tags)} onChange={(value) => setContent({ timeline: content.timeline.map((entry, i) => i === index ? { ...entry, tags: splitCsv(value) } : entry) })} />
          </div>
        )}
      />

      <RepeaterCard
        title="Skills"
        description="The capabilities and strengths you want visitors to understand quickly."
        items={content.aboutStory.whatIDo.pillars}
        onAdd={() => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: [...content.aboutStory.whatIDo.pillars, { k: "New skill", v: "" }] } } })}
        renderItem={(item, index) => (
          <div key={`${item.k}-${index}`} className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Skill</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.filter((_, i) => i !== index) } } })}
              >
                <TrashIcon className="size-4 text-destructive" />
              </Button>
            </div>
            <Field label="Skill" value={item.k} onChange={(k) => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.map((entry, i) => i === index ? { ...entry, k } : entry) } } })} />
            <div className="space-y-2">
              <Label>Detail</Label>
              <TextArea value={item.v} onChange={(v) => setContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.map((entry, i) => i === index ? { ...entry, v } : entry) } } })} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function RepeaterCard<T>({
  title,
  description,
  items,
  onAdd,
  renderItem,
}: {
  title: string;
  description: string;
  items: T[];
  onAdd: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon className="size-4" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map(renderItem) : <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      </CardContent>
    </Card>
  );
}
