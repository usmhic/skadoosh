"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand-mark";
import { signOut, useSession } from "@/lib/auth";
import { SITE_LANGS, useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { KudosMark, initials } from "@/components/kudos/kudos-ui";
import { CreateItemDialog } from "@/components/studio/create-item-dialog";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@skaddosh/ui/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@skaddosh/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@skaddosh/ui/components/ui/dropdown-menu";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CompassIcon,
  FileTextIcon,
  FolderOpenIcon,
  GlobeIcon,
  ImageIcon,
  InboxIcon,
  Loader2Icon,
  LogOutIcon,
  MapIcon,
  MoonIcon,
  PenToolIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean };

export function primaryNav(signedIn: boolean): NavItem[] {
  const explore: NavItem = {
    href: signedIn ? "/" : "/explore",
    label: "Explore",
    icon: CompassIcon,
    match: (p) => (signedIn && p === "/") || p.startsWith("/explore") || p.startsWith("/read") || p.startsWith("/projects"),
  };
  const trips: NavItem = { href: "/trips", label: "Trips", icon: MapIcon, match: (p) => p.startsWith("/trips") };
  if (!signedIn) {
    return [explore, trips, { href: "/how-it-works", label: "How it works", icon: BookOpenIcon, match: (p) => p.startsWith("/how-it-works") }];
  }
  return [
    explore,
    trips,
    { href: "/studio", label: "Studio", icon: PenToolIcon, match: (p) => p.startsWith("/studio") },
    { href: "/kudos", label: "Kudos", icon: WalletIcon, match: (p) => p.startsWith("/kudos") },
  ];
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const { data: me } = trpc.users.me.useQuery(undefined, { enabled: !!session });
  const [searchOpen, setSearchOpen] = useState(false);
  const meUser = me?.user as { username?: string; image?: string | null; onboardingCompleted?: boolean } | undefined;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandMark className="shrink-0" />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {primaryNav(Boolean(session)).map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={active ? 2.25 : 1.9} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <SearchTrigger onOpen={() => setSearchOpen(true)} />
          {session ? (
            <>
              <WalletChip />
              <div className="hidden md:block">
                <CreateMenu />
              </div>
              <NotificationsDropdown />
              <UserMenu name={session.user.name ?? "Your account"} email={session.user.email ?? ""} image={meUser?.image ?? null} username={meUser?.username} />
            </>
          ) : (
            <>
              <ThemeToggle className="hidden sm:inline-flex" />
              <Button size="sm" variant="ghost" className="hidden h-9 px-3.5 sm:inline-flex" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="sm" variant="brand" className="h-9 px-4" asChild>
                <Link href="/auth/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {meUser && meUser.onboardingCompleted === false && !pathname.startsWith("/welcome") ? (
        <Link
          href="/welcome"
          className="flex items-center justify-center gap-2 border-t border-border/60 bg-accent/60 px-4 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent"
        >
          <span className="size-1.5 rounded-full bg-brand" />
          Finish setting up your gallery. It takes two minutes.
          <ArrowRightIcon className="size-3.5" />
        </Link>
      ) : null}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.userAgent)), []);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-foreground/20 hover:text-foreground lg:w-56 lg:px-3.5"
    >
      <SearchIcon className="size-4" />
      <span className="hidden flex-1 text-left lg:inline">Search skaddosh</span>
      <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] lg:inline">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/** A command-palette style search over creators, pieces, and public trips. */
function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const query = value.trim();
  const enabled = open && query.length >= 2;
  const works = trpc.works.list.useQuery({ limit: 5, search: query || undefined }, { enabled });
  const creators = trpc.creators.search.useQuery({ query, limit: 5 }, { enabled });
  const trips = trpc.trips.explore.useQuery({ limit: 48 }, { enabled, staleTime: 60_000 });
  const tripMatches = useMemo(() => {
    const q = query.toLowerCase();
    return (trips.data ?? [])
      .filter((tr) => [tr.title, tr.from, tr.to, tr.summary].join(" ").toLowerCase().includes(q))
      .slice(0, 4);
  }, [trips.data, query]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setValue("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  const loading = works.isFetching || creators.isFetching;
  const nothing = enabled && !loading && !works.data?.length && !creators.data?.length && !tripMatches.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setValue("");
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:top-[12%] sm:max-w-xl sm:translate-y-0" showCloseButton={false} onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query) go(`/read?q=${encodeURIComponent(query)}`);
          }}
          className="flex items-center gap-3 border-b border-border px-4"
        >
          <SearchIcon className="size-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("read.searchPlaceholder")}
            aria-label="Search creators, pieces, and trips"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {loading ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">Esc</kbd>
        </form>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!enabled ? (
            <div className="grid gap-1 p-1 sm:grid-cols-2">
              {[
                { href: "/", label: "Explore the gallery", icon: CompassIcon },
                { href: "/trips", label: "Browse trips", icon: MapIcon },
                { href: "/read", label: "Read pieces", icon: BookOpenIcon },
                { href: "/how-it-works", label: "How skaddosh works", icon: FileTextIcon },
              ].map(({ href, label, icon: Icon }) => (
                <button key={href} type="button" onClick={() => go(href)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <ResultGroup title="Creators" show={Boolean(creators.data?.length)}>
                {creators.data?.map((c) => (
                  <ResultRow key={c.id} onSelect={() => go(`/${c.username}`)} title={c.name ?? ""} subtitle={`@${c.username}`}>
                    <Avatar className="size-8">
                      {c.image ? <AvatarImage src={c.image} alt="" className="object-cover" /> : null}
                      <AvatarFallback className="text-[0.65rem] font-semibold">{initials(c.name ?? "?")}</AvatarFallback>
                    </Avatar>
                  </ResultRow>
                ))}
              </ResultGroup>
              <ResultGroup title="Trips" show={tripMatches.length > 0}>
                {tripMatches.map((tr) => (
                  <ResultRow key={tr.id} onSelect={() => go(`/trips/${tr.id}`)} title={tr.title} subtitle={[tr.from, tr.to].filter(Boolean).join(" → ")}>
                    <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ background: tr.accentColor }}>
                      <MapIcon className="size-4" />
                    </span>
                  </ResultRow>
                ))}
              </ResultGroup>
              <ResultGroup title="Pieces" show={Boolean(works.data?.length)}>
                {works.data?.map((w) => {
                  const title = (w.title as Record<string, string>);
                  return (
                    <ResultRow key={w.id} onSelect={() => go(`/read/${w.id}`)} title={title.en || title.ar || title.fr || title.es || "Untitled"} subtitle={w.type ?? "Piece"}>
                      <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <FileTextIcon className="size-4 text-muted-foreground" />
                      </span>
                    </ResultRow>
                  );
                })}
              </ResultGroup>
              {nothing ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{query}”.</p> : null}
              <button type="button" onClick={() => go(`/read?q=${encodeURIComponent(query)}`)} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                <SearchIcon className="size-4 text-muted-foreground" />
                Search all pieces for “{query}”
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({ title, subtitle, onSelect, children }: { title: string; subtitle?: string; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted">
      {children}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? <span className="block truncate text-xs capitalize text-muted-foreground">{subtitle}</span> : null}
      </span>
    </button>
  );
}

/** One place to start anything: a project, a trip, a piece, or a photo collection. */
export function CreateMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [dialogType, setDialogType] = useState<"article" | "project" | "gallery" | null>(null);
  const createTrip = trpc.trips.create.useMutation({ onSuccess: ({ id }) => router.push(`/trips/${id}`) });
  const items = [
    { key: "project", label: "Project", hint: "Show work in progress and find backers", icon: FolderOpenIcon, onSelect: () => setDialogType("project") },
    { key: "trip", label: "Trip", hint: "Plan a route on the map", icon: MapIcon, onSelect: () => createTrip.mutate({}) },
    { key: "article", label: "Writing", hint: "A story, essay, or poem", icon: FileTextIcon, onSelect: () => setDialogType("article") },
    { key: "gallery", label: "Collection", hint: "A set of photos or images", icon: ImageIcon, onSelect: () => setDialogType("gallery") },
  ] as const;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="brand" size="sm" className={cn("h-9", compact ? "size-11 p-0 [&_svg]:size-5" : "px-3.5")} aria-label="Create">
            {createTrip.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            {compact ? null : <span className="hidden sm:inline">Create</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-1.5">
          {items.map(({ key, label, hint, icon: Icon, onSelect }) => (
            <DropdownMenuItem key={key} onSelect={onSelect} className="items-start gap-3 rounded-lg px-2.5 py-2">
              <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateItemDialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)} initialType={dialogType ?? undefined} />
    </>
  );
}

function UserMenu({ name, email, image, username }: { name: string; email: string; image: string | null; username?: string }) {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-9 rounded-full p-0" aria-label="Open account menu">
          <Avatar className="size-8 ring-2 ring-background">
            {image ? <AvatarImage src={image} alt="" className="object-cover" /> : null}
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={username ? `/${username}` : "/profile"}>
            <UserIcon /> Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/trips">
            <MapIcon /> Your trips
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/kudos">
            <WalletIcon /> Kudos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/portfolio/edit">
            <BookOpenIcon /> Portfolio
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/inbox">
            <InboxIcon /> Inbox
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1 px-1.5 py-1">
          <GlobeIcon className="mr-1 size-4 text-muted-foreground" />
          {SITE_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              aria-pressed={lang === item.code}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-[0.68rem] font-semibold uppercase",
                lang === item.code ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.short}
            </button>
          ))}
        </div>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTheme(isDark ? "light" : "dark"); }}>
          {isDark ? <SunIcon /> : <MoonIcon />} {isDark ? "Light theme" : "Dark theme"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-9", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}

export function LanguageDropdown() {
  const { lang, setLang } = useLang();
  const active = SITE_LANGS.find((item) => item.code === lang) ?? SITE_LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" aria-label="Change language">
          <GlobeIcon className="size-4" />
          <span className="font-mono text-[0.7rem] font-semibold uppercase">{active?.short ?? "EN"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SITE_LANGS.map((item) => (
          <DropdownMenuItem key={item.code} onClick={() => setLang(item.code)} className="flex items-center justify-between">
            <span>{item.label}</span>
            <span className="font-mono text-[0.65rem] text-muted-foreground">{item.short}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Hot · Cold at a glance. */
function WalletChip() {
  const { data: wallet } = trpc.kudos.wallet.useQuery(undefined, { staleTime: 30_000 });
  return (
    <Link
      href="/kudos"
      aria-label={`Kudos: ${wallet?.hot ?? 0} Hot, ${wallet?.cold ?? 0} Cold`}
      className="hidden h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold tabular-nums shadow-xs transition-colors hover:border-foreground/20 lg:inline-flex"
    >
      <span className="inline-flex items-center gap-1">
        <KudosMark temp="hot" size="xs" />
        {wallet?.hot ?? "–"}
      </span>
      <span className="h-3.5 w-px bg-border" />
      <span className="inline-flex items-center gap-1">
        <KudosMark temp="cold" size="xs" />
        {wallet?.cold ?? "–"}
      </span>
    </Link>
  );
}
