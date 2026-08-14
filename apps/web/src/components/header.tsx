"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { signOut, useSession } from "@/lib/auth";
import { SITE_LANGS, useLang } from "@/lib/lang-context";
import { trpc } from "@/lib/trpc/provider";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@skaddosh/ui/components/ui/avatar";
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
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CreditCardIcon,
  FileTextIcon,
  GlobeIcon,
  InboxIcon,
  LogOutIcon,
  MinusIcon,
  MoonIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { SEED_WORKS } from "@skaddosh/db/seed-data";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

export function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  type SessionUser = NonNullable<typeof session>["user"] & { role?: string };
  const user = session?.user as SessionUser | undefined;
  const { data: me } = trpc.users.me.useQuery(undefined, {
    enabled: !!session,
  });
  const hotKudos =
    (me?.user as { kudosBalance?: number; username?: string } | undefined)
      ?.kudosBalance ?? 0;
  const username = (me?.user as { username?: string } | undefined)?.username;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);
  const [purchaseAmount, setPurchaseAmount] = useState(25);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchQuery = searchVal.trim();
  const suggestionsQuery = trpc.works.list.useQuery(
    { limit: 5, search: searchQuery || undefined },
    { enabled: searchOpen && searchQuery.length >= 2 },
  );
  const creatorsQuery = trpc.creators.search.useQuery(
    { query: searchQuery, limit: 5 },
    { enabled: searchOpen && searchQuery.length >= 2 },
  );
  const creatorResults = creatorsQuery.data ?? [];
  const searchSuggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const live = suggestionsQuery.data ?? [];
    if (live.length) return live;
    return SEED_WORKS.filter((work) => {
      const haystack = [
        work.title.en,
        work.title.ar,
        work.title.fr,
        work.title.es,
        work.tag.en,
        work.tag.ar,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    })
      .slice(0, 5)
      .map((work) => ({
        ...work,
        title: work.title as Record<string, string>,
        tag: work.tag as Record<string, string>,
      }));
  }, [searchQuery, suggestionsQuery.data]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchVal("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, searchOpen]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchVal.trim())
        router.push(`/read?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    },
    [searchVal, router],
  );

  const openSuggestion = useCallback(
    (id: string) => {
      setSearchOpen(false);
      setSearchVal("");
      router.push(`/read/${id}`);
    },
    [router],
  );

  const startKudosCheckout = useCallback(async () => {
    setCheckoutPending(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/billing/kudos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: purchaseAmount }),
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url)
        throw new Error(payload.error ?? "Unable to open checkout.");
      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to open checkout.",
      );
      setCheckoutPending(false);
    }
  }, [purchaseAmount]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="relative grid h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <BrandMark className="min-w-0 shrink-0" />
          {session ? (
            <>
              <span className="hidden h-6 w-px bg-border/60 sm:inline" />
              <HotKudosDropdown
                hotKudos={hotKudos}
                purchaseAmount={purchaseAmount}
                setPurchaseAmount={setPurchaseAmount}
                checkoutError={checkoutError}
                checkoutPending={checkoutPending}
                onPurchase={startKudosCheckout}
              />
            </>
          ) : null}
        </div>

        {searchOpen ? (
          <form
            onSubmit={submitSearch}
            className="absolute inset-x-3 z-10 flex min-w-0 items-center gap-1.5 bg-background sm:inset-x-6 md:static md:col-span-2 md:bg-transparent"
          >
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder={t("read.searchPlaceholder")}
                className="h-10 w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-3 text-sm shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                aria-label="Search works and creators"
                onBlur={() => {
                  if (!searchVal) setSearchOpen(false);
                }}
              />
              {searchQuery.length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                  {creatorResults.length ? (
                    <>
                      <div className="border-b border-border px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Creators
                      </div>
                      {creatorResults.map((creator) => (
                        <button
                          key={creator.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchVal("");
                            router.push(`/${creator.username}`);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                        >
                          <Avatar className="size-7">
                            {creator.image ? (
                              <AvatarImage
                                src={creator.image}
                                alt={creator.name ?? ""}
                                className="object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="text-[0.6rem] font-semibold">
                              {(creator.name ?? "??")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {creator.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              @{creator.username}
                            </span>
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}
                  <div
                    className={cn(
                      "border-b border-border px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground",
                      creatorResults.length && "border-t",
                    )}
                  >
                    Suggestions
                  </div>
                  {searchSuggestions.length ? (
                    searchSuggestions.map((item) => {
                      const title =
                        item.title.en ||
                        item.title.ar ||
                        item.title.fr ||
                        item.title.es ||
                        "Untitled";
                      const tag = item.tag.en || item.tag.ar || "";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => openSuggestion(item.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                        >
                          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {tag || item.type || "Work"}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      {suggestionsQuery.isFetching
                        ? "Searching..."
                        : "No suggestions yet."}
                    </div>
                  )}
                  <button
                    type="submit"
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
                  >
                    <SearchIcon className="size-4 text-muted-foreground" />
                    Search for "{
                      searchQuery
                    }"
                  </button>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchOpen(false);
                setSearchVal("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </form>
        ) : (
          <>
            <nav
              className="hidden min-w-0 items-center justify-center gap-1 md:flex"
              aria-label="Primary navigation"
            >
              <HeaderNavLink
                href="/read"
                active={pathname === "/" || pathname.startsWith("/read")}
              >
                Discover
              </HeaderNavLink>
              {session ? (
                <>
                  <HeaderNavLink
                    href="/studio"
                    active={pathname.startsWith("/studio")}
                  >
                    Studio
                  </HeaderNavLink>
                  <HeaderNavLink
                    href="/portfolio/edit"
                    active={pathname.startsWith("/portfolio")}
                  >
                    Portfolio
                  </HeaderNavLink>
                </>
              ) : null}
            </nav>

            <div className="col-start-3 flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2"
                onClick={openSearch}
                aria-label="Search"
              >
                <SearchIcon className="size-4" />
                <kbd className="hidden rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:inline-block">
                  {isMac ? "⌘K" : "Ctrl K"}
                </kbd>
              </Button>

              {session ? (
                <>
                  <div className="hidden items-center sm:flex">
                    <LanguageDropdown />
                    <ThemeToggle />
                  </div>
                  <NotificationsDropdown />
                  <UserMenu
                    name={user?.name ?? "Your account"}
                    email={user?.email ?? ""}
                    image={
                      (me?.user as { image?: string | null } | undefined)
                        ?.image ?? null
                    }
                    username={username}
                  />
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <LanguageDropdown />
                  <ThemeToggle />
                  <Button size="sm" className="px-2.5 sm:px-3" asChild>
                    <Link href="/auth/signup">
                      <PenLineIcon className="size-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">
                        {t("auth.getStartedFree")}
                      </span>
                      <span className="sm:hidden">Start</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function HeaderNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function UserMenu({
  name,
  email,
  image,
  username,
}: {
  name: string;
  email: string;
  image: string | null;
  username?: string;
}) {
  const router = useRouter();
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-9 rounded-full p-0"
          aria-label="Open account menu"
        >
          <Avatar className="size-8">
            {image ? (
              <AvatarImage src={image} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={username ? `/${username}` : "/profile"}>
            <UserIcon /> Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/studio">
            <BriefcaseBusinessIcon /> Studio
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
        <DropdownMenuItem
          onSelect={() => void handleSignOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageDropdown() {
  const { lang, setLang } = useLang();
  const active = SITE_LANGS.find((item) => item.code === lang) ?? SITE_LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          aria-label="Change language"
        >
          <GlobeIcon className="size-4" />
          <span className="font-mono text-[0.7rem] font-semibold uppercase">
            {active?.short ?? "EN"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SITE_LANGS.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => setLang(item.code)}
            className="flex items-center justify-between"
          >
            <span>{item.label}</span>
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {item.short}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  );
}

function HotKudosDropdown({
  hotKudos,
  purchaseAmount,
  setPurchaseAmount,
  checkoutError,
  checkoutPending,
  onPurchase,
}: {
  hotKudos: number;
  purchaseAmount: number;
  setPurchaseAmount: React.Dispatch<React.SetStateAction<number>>;
  checkoutError: string;
  checkoutPending: boolean;
  onPurchase: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
          <KudosIcon />
          <span className="font-mono text-xs tabular-nums">{hotKudos}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <div>
            <p className="text-sm font-semibold">Hot Kudos</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Purchased Kudos available to spend. Cold Kudos are the ones sent
              to work.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">Balance</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold">
                <KudosIcon />
                {hotKudos}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-3 p-2">
          <div className="flex gap-1.5">
            {[25, 100, 250].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setPurchaseAmount(amount)}
                className={cn(
                  "h-8 flex-1 rounded-md border text-xs font-semibold transition",
                  purchaseAmount === amount
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {amount}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setPurchaseAmount((a) => Math.max(25, a - 25))}
            >
              <MinusIcon className="size-3.5" />
            </Button>
            <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold">
              <KudosIcon />
              {purchaseAmount}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setPurchaseAmount((a) => Math.min(250, a + 25))}
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
          {checkoutError ? (
            <p className="text-xs leading-5 text-destructive">
              {checkoutError}
            </p>
          ) : null}
          <Button
            className="w-full"
            size="sm"
            onClick={onPurchase}
            disabled={checkoutPending}
          >
            <CreditCardIcon className="size-4" />
            {checkoutPending ? "Opening..." : "Purchase"}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function KudosIcon() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full border border-current font-display text-[0.65rem] font-semibold italic leading-none">
      K
    </span>
  );
}
