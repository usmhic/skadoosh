"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Card, CardContent } from "@skaddosh/ui/components/ui/card";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowUpRightIcon,
  BookOpenTextIcon,
  GithubIcon,
  ImagesIcon,
  MailIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";

type PortfolioCustomization = {
  themePreset?: "skaddosh" | "ink" | "ember" | "forest" | "ocean";
  accentColor?: string;
  headingFont?: "Spectral" | "Geist" | "Cairo";
  monoFont?: "Geist Mono" | "Cairo";
  heroAlignment?: "left" | "center";
  sectionSpacing?: "compact" | "balanced" | "airy";
  cardStyle?: "soft" | "outline" | "elevated";
  visibleSections?: PortfolioSection[];
  customDomainRequested?: boolean;
  customDomain?: string;
};

type PortfolioSection = "about" | "articles" | "projects" | "gallery" | "contact";

type PortfolioContent = {
  siteConfig: {
    name: string;
    firstName: string;
    lastName: string;
    initials: string;
    tagline: string;
    location: string;
    phone: string;
    email: string;
    avatar: string;
    social: { github: string; linkedin: string; instagram: string };
  };
  heroImage: { url: string; alt: string };
  aboutStory: {
    whoAmI: { label: string; title: string; body: string; location: string };
    whatIDo: {
      label: string;
      title: string;
      body: string;
      pillars: Array<{ k: string; v: string }>;
    };
  };
  timeline: Array<{
    id: string;
    year: string;
    type: "work" | "academic" | "project" | "award";
    title: string;
    org: string;
    description: string;
    tags?: string[];
    image?: string;
  }>;
  research: Array<{
    id: string;
    field: string;
    title: string;
    description: string;
    collaborators?: string[];
    status?: "ongoing" | "published" | "exploratory";
  }>;
  hobbies: Array<{ id: string; emoji: string; title: string; description: string }>;
  highlighting: {
    workIds: string[];
    projectIds: string[];
    galleryIds: string[];
  };
};

export type PortfolioViewProfile = {
  username: string;
  displayName: string;
  prompt: string;
  profileType?: string;
  premium?: boolean;
  customization: PortfolioCustomization;
  content: PortfolioContent;
  works?: Array<{
    id: string;
    type: string;
    title: Record<string, string>;
    tag: Record<string, string>;
    readingTime?: number | null;
    kudosCount?: number;
    accentColor?: string;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    description: string;
    coverImage?: string | null;
    accentColor: string;
    tags: string[];
    url?: string | null;
    locked?: boolean;
  }>;
  gallery?: Array<{
    id: string;
    name: string;
    description: string;
    coverImage?: string | null;
    accentColor: string;
    imageCount: number;
    images: Array<{ url: string; caption: string }>;
    locked?: boolean;
  }>;
};

const DEFAULT_PORTFOLIO_SECTIONS: PortfolioSection[] = ["about", "articles", "contact"];
const SECTION_LABELS: Record<PortfolioSection, string> = {
  about: "About",
  articles: "Articles",
  projects: "Projects",
  gallery: "Gallery",
  contact: "Contact",
};
const SECTION_HREFS: Record<PortfolioSection, string> = {
  about: "#about",
  articles: "#articles",
  projects: "#projects",
  gallery: "#gallery",
  contact: "#contact",
};

function getVisitorId() {
  if (typeof window === "undefined") return null;
  const key = "skaddosh-portfolio-visitor-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.36em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
        {title}
      </h2>
      {body ? <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">{body}</p> : null}
    </div>
  );
}

function EmptyImage({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-background to-muted", className)}>
      <div className="text-center">
        <ImagesIcon className="mx-auto size-6 text-muted-foreground/40" />
        <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground/60">
          {label}
        </p>
      </div>
    </div>
  );
}

export function PortfolioView({
  profile,
  editHref,
  framed = false,
  preview = false,
}: {
  profile: PortfolioViewProfile;
  editHref?: string;
  framed?: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const recordEvent = trpc.portfolios.recordEvent.useMutation();
  const submitContact = trpc.portfolios.submitContact.useMutation();
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [contactSubject, setContactSubject] = useState("Project inquiry");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [sent, setSent] = useState(false);
  const searchQuery = portfolioSearch.trim();
  const portfolioSearchResults = trpc.portfolios.searchPublic.useQuery(
    { username: profile.username, query: searchQuery || "portfolio" },
    { enabled: !preview && searchQuery.length >= 2 },
  );

  const content = profile.content;
  const cfg = content.siteConfig;
  const visibleSections = profile.customization?.visibleSections?.length
    ? profile.customization.visibleSections
    : DEFAULT_PORTFOLIO_SECTIONS;
  const isVisible = (section: PortfolioSection) => visibleSections.includes(section);
  const accent = profile.customization?.accentColor || "#18181b";
  const isCentered = profile.customization?.heroAlignment === "center";
  const sectionClass =
    profile.customization?.sectionSpacing === "compact"
      ? "py-16 sm:py-20"
      : profile.customization?.sectionSpacing === "airy"
        ? "py-28 sm:py-36"
        : "py-20 sm:py-28";
  const cardClass =
    profile.customization?.cardStyle === "outline"
      ? "border border-border bg-background"
      : profile.customization?.cardStyle === "elevated"
        ? "border border-border/70 bg-card shadow-xl shadow-black/5"
        : "border border-border/70 bg-card/75";

  useEffect(() => {
    if (preview) return;
    recordEvent.mutate({
      username: profile.username,
      eventType: "view",
      eventName: "portfolio_page_view",
      path: pathname,
      visitorId: getVisitorId(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, preview, profile.username]);

  const trackClick = (eventName: string, metadata?: Record<string, string | number | boolean | null>) => {
    if (preview) return;
    recordEvent.mutate({
      username: profile.username,
      eventType: "click",
      eventName,
      path: pathname,
      visitorId: getVisitorId(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      metadata,
    });
  };

  const handleContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSent(false);
    submitContact.mutate(
      {
        username: profile.username,
        kind: contactSubject.toLowerCase().includes("access") ? "access_request" : "contact",
        subject: contactSubject,
        from: { name: contactName, email: contactEmail },
        body: contactBody,
      },
      {
        onSuccess: () => {
          setSent(true);
          setContactName("");
          setContactEmail("");
          setContactBody("");
          trackClick("contact_submit");
        },
      },
    );
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        framed && "overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-black/10",
      )}
      style={{ "--portfolio-accent": accent } as React.CSSProperties}
    >
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={`/portfolio/${profile.username}`} className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {cfg.initials || profile.displayName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{profile.displayName}</span>
              <span className="block truncate font-mono text-[0.65rem] text-muted-foreground">
                skaddosh/portfolio/{profile.username}
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {visibleSections.map((item) => (
              <a
                key={item}
                href={SECTION_HREFS[item]}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {SECTION_LABELS[item]}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {editHref ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={editHref}>Edit Portfolio</Link>
              </Button>
            ) : null}
            {cfg.email ? (
              <Button size="sm" asChild>
                <a href="#contact">Contact</a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
          <div
            className="absolute inset-x-0 top-0 -z-10 h-48 opacity-10"
            style={{ backgroundColor: accent }}
          />
          <div className={cn("mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]", isCentered && "lg:grid-cols-1")}>
            <div className={cn("max-w-2xl", isCentered && "mx-auto text-center")}>
              <Badge variant="outline" className="mb-6 gap-2">
                <MapPinIcon className="size-3" />
                {cfg.location || "Portfolio"}
              </Badge>
              <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-7xl lg:text-8xl">
                {cfg.firstName || profile.displayName}
                {cfg.lastName ? (
                  <span className="block italic text-muted-foreground">{cfg.lastName}</span>
                ) : null}
              </h1>
              <p className={cn("mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg", isCentered && "mx-auto")}>
                {cfg.tagline || profile.prompt}
              </p>
              <div className={cn("mt-8 max-w-xl rounded-2xl border border-border bg-card/85 p-3 shadow-sm", isCentered && "mx-auto")}>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={portfolioSearch}
                    onChange={(event) => setPortfolioSearch(event.target.value)}
                    placeholder="Search story, research, articles, timeline..."
                    className="pl-9"
                  />
                </div>
                {searchQuery.length >= 2 ? (
                  <div className="mt-3 space-y-2">
                    {portfolioSearchResults.data?.results.length ? (
                      portfolioSearchResults.data.results.map((result) => (
                        <Link
                          key={`${result.type}-${result.href}-${result.title}`}
                          href={result.href}
                          className="block rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40"
                          onClick={() => trackClick("portfolio_search_result", { query: searchQuery, resultType: result.type, resultTitle: result.title })}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold">{result.title}</p>
                            <Badge variant="secondary">{result.type}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{result.description || "Open result"}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-1 text-xs text-muted-foreground">
                        {portfolioSearchResults.isFetching ? "Searching..." : "No matching portfolio items yet."}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            {!isCentered ? (
              <div className="mx-auto w-full max-w-sm">
                <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/10">
                  {content.heroImage.url || cfg.avatar ? (
                    <img
                      src={content.heroImage.url || cfg.avatar}
                      alt={content.heroImage.alt || cfg.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <EmptyImage label="Hero image" />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {isVisible("about") ? (
        <section id="about" className={cn(sectionClass, "scroll-mt-24 px-4 sm:px-6")}>
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow={content.aboutStory.whoAmI.label}
              title={content.aboutStory.whoAmI.title}
              body={content.aboutStory.whoAmI.body}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {content.aboutStory.whatIDo.pillars.map((pillar) => (
                <Card key={pillar.k} className={cn(cardClass, "py-0")}>
                  <CardContent className="p-5">
                    <SparklesIcon className="mb-5 size-4" style={{ color: accent }} />
                    <h3 className="font-semibold">{pillar.k}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.v}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        ) : null}

        {isVisible("about") && content.timeline.length > 0 ? (
          <section className={cn(sectionClass, "px-4 sm:px-6")}>
            <div className="mx-auto max-w-4xl">
              <SectionHeading eyebrow="03 - Journey" title="The road so far." />
              <div className="space-y-4">
                {content.timeline.map((item) => (
                  <div key={item.id} className={cn(cardClass, "rounded-2xl p-5")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.type}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{item.year}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                    <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: accent }}>
                      {item.org}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                    {item.tags?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isVisible("articles") && profile.works?.length ? (
          <section id="articles" className={cn(sectionClass, "scroll-mt-24 px-4 sm:px-6")}>
            <div className="mx-auto max-w-6xl">
              <SectionHeading
                eyebrow="03 - Articles"
                title="Published work."
                body="Articles, essays, and other pieces published through skaddosh."
              />
              <div className="grid gap-3 md:grid-cols-3">
                {profile.works.map((work) => {
                  const title = work.title.en || work.title.ar || work.title.fr || work.title.es || "Untitled";
                  const tag = work.tag.en || work.tag.ar || "";
                  return (
                    <Link
                      key={work.id}
                      href={`/read/${work.id}`}
                      className={cn(cardClass, "group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary/40")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" style={{ color: work.accentColor || accent, borderColor: `${work.accentColor || accent}40` }}>
                          {work.type}
                        </Badge>
                        {work.readingTime ? <span className="text-xs text-muted-foreground">{work.readingTime} min</span> : null}
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">{title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{tag}</p>
                      <p className="mt-5 text-xs text-muted-foreground">{work.kudosCount ?? 0} Cold Kudos</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {isVisible("about") && content.research.length > 0 ? (
          <section className={cn(sectionClass, "px-4 sm:px-6")}>
            <div className="mx-auto max-w-6xl">
              <SectionHeading eyebrow="04 - Research" title="Curiosity at the edge." />
              <div className="grid gap-3 md:grid-cols-3">
                {content.research.map((item) => (
                  <div key={item.id} className={cn(cardClass, "rounded-2xl p-5")}>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em]" style={{ color: accent }}>
                      {item.field}
                    </p>
                    <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    {item.collaborators?.length ? (
                      <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                        With {item.collaborators.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {content.hobbies.length > 0 ? (
          <section className={cn(sectionClass, "px-4 sm:px-6")}>
            <div className="mx-auto max-w-6xl">
              <SectionHeading eyebrow="Off The Clock" title="The human layer." />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {content.hobbies.map((item) => (
                  <div key={item.id} className={cn(cardClass, "rounded-2xl p-5")}>
                    <div className="text-3xl">{item.emoji}</div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isVisible("projects") && (profile.projects?.length ?? 0) > 0 ? (
          <section id="projects" className={cn(sectionClass, "scroll-mt-24 px-4 sm:px-6")}>
            <div className="mx-auto max-w-6xl">
              <SectionHeading
                eyebrow="04 - Projects"
                title="Projects I've shipped."
                body="A selection of work from the studio."
              />
              <div className="grid gap-3 md:grid-cols-2">
                {profile.projects?.map((proj) => (
                  <div key={proj.id} className={cn(cardClass, "group rounded-2xl overflow-hidden")}>
                    {proj.coverImage ? (
                      <img src={proj.coverImage} alt={proj.title} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video"><EmptyImage label="Cover" /></div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold">{proj.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{proj.description}</p>
                      {proj.tags.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {proj.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                        </div>
                      ) : null}
                      {proj.url ? (
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" asChild onClick={() => trackClick("project_url_click", { project: proj.title })}>
                            <a href={proj.url} target="_blank" rel="noreferrer">
                              <ArrowUpRightIcon className="size-3.5 mr-1" />
                              View
                            </a>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isVisible("gallery") && (profile.gallery?.length ?? 0) > 0 ? (
          <section id="gallery" className={cn(sectionClass, "scroll-mt-24 px-4 sm:px-6")}>
            <div className="mx-auto max-w-6xl">
              <SectionHeading eyebrow="05 - Gallery" title="Visual work." />
              <div className="space-y-10">
                {profile.gallery?.map((folder) => (
                  <div key={folder.id}>
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{folder.name}</h3>
                        {folder.description ? <p className="mt-1 text-sm text-muted-foreground">{folder.description}</p> : null}
                      </div>
                      <span className="font-mono text-[0.65rem] text-muted-foreground">{folder.imageCount} photos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {folder.images.map((img, index) => (
                        <div key={`${folder.id}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                          <img src={img.url} alt={img.caption || folder.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                          {img.caption ? (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 px-2 pb-2 pt-4 opacity-0 transition group-hover:opacity-100">
                              <p className="text-[0.65rem] text-white">{img.caption}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isVisible("contact") ? (
        <section id="contact" className="scroll-mt-24 border-t border-border px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionHeading
                eyebrow="07 - Contact"
                title="Start a conversation."
                body="Send a project inquiry, ask for access to private work, or open a direct email thread."
              />
              <div className="flex flex-wrap gap-3">
                {cfg.email ? (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${cfg.email}`} onClick={() => trackClick("contact_email_click")}>
                      <MailIcon className="size-4" />
                      {cfg.email}
                    </a>
                  </Button>
                ) : null}
                {cfg.social.github ? (
                  <Button variant="ghost" asChild>
                    <a href={cfg.social.github} target="_blank" rel="noreferrer" onClick={() => trackClick("github_click")}>
                      <GithubIcon className="size-4" />
                      GitHub
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <form onSubmit={handleContactSubmit} className={cn(cardClass, "rounded-2xl p-5")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="portfolio-contact-name">Name</Label>
                  <Input id="portfolio-contact-name" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio-contact-email">Email</Label>
                  <Input id="portfolio-contact-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="portfolio-contact-subject">Subject</Label>
                <Input id="portfolio-contact-subject" value={contactSubject} onChange={(event) => setContactSubject(event.target.value)} required />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="portfolio-contact-body">Message</Label>
                <textarea
                  id="portfolio-contact-body"
                  value={contactBody}
                  onChange={(event) => setContactBody(event.target.value)}
                  required
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {sent ? "Message saved to the portfolio inbox." : submitContact.error?.message}
                </p>
                <Button type="submit" disabled={submitContact.isPending}>
                  {submitContact.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </div>
        </section>
        ) : null}
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {cfg.name || profile.displayName}</p>
          <Link href="/" className="inline-flex items-center gap-2 hover:text-foreground">
            Built into skaddosh <ArrowUpRightIcon className="size-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
