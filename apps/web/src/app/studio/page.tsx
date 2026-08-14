"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { CreateContentMenu } from "@/components/studio/create-content-menu";
import { StudioHero, StudioMain, StudioSectionSkeleton } from "@/components/studio/studio-page-shell";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  BookOpenIcon,
  FolderOpenIcon,
  ImageIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";

// ── Shared item row ────────────────────────────────────────────────────────────

function ItemRow({
  href,
  accent,
  title,
  meta,
  badge,
}: {
  href: string;
  accent: string;
  title: string;
  meta: string;
  badge?: { label: string; published: boolean };
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3.5 transition-all hover:bg-muted/40"
    >
      <div className="size-2.5 shrink-0 rounded-full" style={{ background: accent }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">{meta}</p>
      </div>
      {badge ? (
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[0.6rem]",
            badge.published
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : "",
          )}
        >
          {badge.label}
        </Badge>
      ) : null}
      <PencilIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

// ── Section block ──────────────────────────────────────────────────────────────

type ContentType = "article" | "project" | "gallery";

function Section({
  icon: Icon,
  title,
  count,
  contentType,
  children,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  contentType: ContentType;
  children: React.ReactNode;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
        </div>
        <CreateContentMenu iconOnly buttonLabel="New" initialType={contentType} />
      </div>
      <div className="divide-y divide-border/60">
        {count > 0 ? (
          children
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats strip ────────────────────────────────────────────────────────────────

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
      {icon}
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const { data: session } = useSession();
  const worksQuery    = trpc.works.mine.useQuery();
  const projectsQuery = trpc.projects.mine.useQuery();
  const galleryQuery  = trpc.gallery.mine.useQuery();

  const works    = worksQuery.data    ?? [];
  const projects = projectsQuery.data ?? [];
  const gallery  = galleryQuery.data  ?? [];

  const publishedWorks    = works.filter((w) => w.published).length;
  const publishedProjects = projects.filter((p) => p.status === "published").length;
  const totalKudos        = works.reduce((s, w) => s + (w.kudosCount ?? 0), 0);

  const isPending = worksQuery.isPending || projectsQuery.isPending || galleryQuery.isPending;

  return (
    <div className="min-h-full">
      <StudioHero
        title={session?.user.name ? `${session.user.name}'s Studio` : "Studio"}
        description="Write, build, and shoot — your full creative space."
        actions={<CreateContentMenu buttonLabel="New" />}
      />

      <StudioMain wide>
        {/* Stats */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Stat
            icon={<BookOpenIcon className="size-4 text-muted-foreground" />}
            value={publishedWorks}
            label="articles published"
          />
          <Stat
            icon={<FolderOpenIcon className="size-4 text-muted-foreground" />}
            value={publishedProjects}
            label="projects live"
          />
          <Stat
            icon={
              <span className="inline-flex size-4 items-center justify-center rounded-full border border-muted-foreground font-display text-[0.6rem] font-semibold italic leading-none text-muted-foreground">
                K
              </span>
            }
            value={totalKudos}
            label="kudos"
          />
          <Stat
            icon={<SparklesIcon className="size-4 text-muted-foreground" />}
            value={works.length - publishedWorks}
            label="drafts"
          />
        </div>

        {/* Three content sections */}
        <div className="space-y-4">
          {/* Articles */}
          {isPending ? (
            <StudioSectionSkeleton rows={3} />
          ) : (
            <>
              <Section
                icon={BookOpenIcon}
                title="Articles"
                count={works.length}
                contentType="article"
                emptyLabel="No articles yet. Hit New to write your first piece."
              >
                {works.map((w) => {
                  const title =
                    (w.title as Record<string, string>).en ||
                    (w.title as Record<string, string>).ar ||
                    "Untitled";
                  return (
                    <div key={w.id} className="px-2 py-1">
                      <ItemRow
                        href={`/studio/works/${w.id}`}
                        accent={(w as { accentColor?: string }).accentColor ?? "#6366f1"}
                        title={title}
                        meta={`${(w as { type?: string }).type} · ${(w as { kudosCount?: number }).kudosCount ?? 0} kudos`}
                        badge={{ label: w.published ? "Published" : "Draft", published: w.published }}
                      />
                    </div>
                  );
                })}
              </Section>

              {/* Projects */}
              <Section
                icon={FolderOpenIcon}
                title="Projects"
                count={projects.length}
                contentType="project"
                emptyLabel="No projects yet. Showcase what you've built."
              >
                {projects.map((p) => (
                  <div key={p.id} className="px-2 py-1">
                    <ItemRow
                      href={`/studio/projects/${p.id}`}
                      accent={p.accentColor}
                      title={p.title || "Untitled project"}
                      meta={p.tags.join(", ") || "No tags"}
                      badge={{ label: p.status === "published" ? "Published" : "Draft", published: p.status === "published" }}
                    />
                  </div>
                ))}
              </Section>

              {/* Gallery */}
              <Section
                icon={ImageIcon}
                title="Gallery"
                count={gallery.length}
                contentType="gallery"
                emptyLabel="No collections yet. Create a photo gallery."
              >
                {gallery.map((g) => (
                  <div key={g.id} className="px-2 py-1">
                    <ItemRow
                      href={`/studio/gallery/${g.id}`}
                      accent={g.accentColor}
                      title={g.name || "Untitled collection"}
                      meta={`${g.images.length} photo${g.images.length !== 1 ? "s" : ""}`}
                      badge={{ label: g.status === "published" ? "Published" : "Draft", published: g.status === "published" }}
                    />
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>
      </StudioMain>
    </div>
  );
}
