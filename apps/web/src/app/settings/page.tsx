"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { useLang, SITE_LANGS } from "@/lib/lang-context";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@skaddosh/ui/components/ui/card";
import { Separator } from "@skaddosh/ui/components/ui/separator";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { AvatarUpload } from "@/components/avatar-upload";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  UserIcon,
  BellIcon,
  ShieldIcon,
  GlobeIcon,
  ArrowUpRightIcon,
  CheckIcon,
  Loader2Icon,
  TagIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";

const CATEGORIES = [
  "intellectual-property",
  "science",
  "technology",
  "philosophy",
  "literature",
  "history",
  "politics",
  "economics",
  "art",
  "culture",
  "society",
  "environment",
] as const;

type SettingsTab = "profile" | "notifications" | "privacy" | "preferences";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { data: session } = useSession();
  type SessionUser = NonNullable<typeof session>["user"] & {
    role?: string;
    username?: string;
    bio?: string;
    website?: string;
    location?: string;
  };
  const sessionUser = session?.user as SessionUser | undefined;

  const initialTab = searchParams.get("tab") as SettingsTab | null;
  const [tab, setTab] = useState<SettingsTab>(
    initialTab &&
      ["profile", "notifications", "privacy", "preferences"].includes(
        initialTab,
      )
      ? initialTab
      : "profile",
  );
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Profile form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // Settings state
  const [prefLang, setPrefLang] = useState<"ar" | "en" | "fr" | "es">("en");
  const [emailNotif, setEmailNotif] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showKudos, setShowKudos] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const { data: userData } = trpc.users.me.useQuery();
  const updateProfile = trpc.users.updateProfile.useMutation();
  const updateSettings = trpc.users.updateSettings.useMutation();

  useEffect(() => {
    if (userData) {
      setName(userData.user.name ?? "");
      setUsername(userData.user.username ?? "");
      setBio(userData.user.bio ?? "");
      setWebsite((userData.user as { website?: string }).website ?? "");
      setLocation((userData.user as { location?: string }).location ?? "");
      setImage((userData.user as { image?: string | null }).image ?? null);
      if (userData.settings) {
        const savedLang =
          (userData.settings.preferredLang as "ar" | "en" | "fr" | "es") ??
          lang;
        setPrefLang(savedLang);
        setEmailNotif(userData.settings.emailNotifications);
        setMarketingEmails(userData.settings.marketingEmails);
        setProfilePublic(userData.settings.profilePublic);
        setShowKudos(userData.settings.showKudosBalance);
        try {
          setCategories(
            JSON.parse(userData.settings.contentCategories ?? "[]") as string[],
          );
        } catch {
          setCategories([]);
        }
      }
    }
  }, [lang, userData]);

  const handleSaveProfile = async () => {
    setSaveError("");
    try {
      await updateProfile.mutateAsync({
        name: name || undefined,
        username: username || undefined,
        bio,
        website,
        location,
      });
      await utils.users.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    }
  };

  const handleAvatarChange = async (url: string) => {
    setImage(url);
    setSaveError("");
    try {
      await updateProfile.mutateAsync({ image: url });
      await utils.users.me.invalidate();
      if (username) await utils.creators.byUsername.invalidate({ username });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not update your photo.",
      );
    }
  };

  const handleSaveSettings = async () => {
    setSaveError("");
    try {
      await updateSettings.mutateAsync({
        preferredLang: prefLang,
        emailNotifications: emailNotif,
        marketingEmails,
        profilePublic,
        showKudosBalance: showKudos,
        contentCategories: categories,
      });
      await utils.users.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save your preferences.",
      );
    }
  };

  const toggleCategory = (c: string) =>
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const initials =
    sessionUser?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "??";

  const TABS: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "preferences", label: "Preferences", icon: GlobeIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "privacy", label: "Privacy", icon: ShieldIcon },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences and privacy.
        </p>
      </div>

      {saveError ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {saveError}
        </div>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        {/* Sidebar */}
        <aside className="min-w-0 shrink-0 sm:w-44">
          <nav
            className="flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0"
            aria-label="Settings sections"
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex w-auto shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:w-full",
                  tab === id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ── Profile ────────────────────────────────────── */}
          {tab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Public profile</CardTitle>
                <CardDescription>
                  This information is visible to people who open your public
                  profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <AvatarUpload
                    value={image}
                    fallback={initials}
                    onChange={handleAvatarChange}
                    size="size-14"
                  />
                  <div>
                    <p className="text-sm font-medium">{sessionUser?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sessionUser?.email}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Display name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <div className="flex items-center">
                      <span className="flex h-9 items-center rounded-l-md border border-r-0 border-border bg-muted px-2.5 text-xs text-muted-foreground">
                        @
                      </span>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase())
                        }
                        placeholder="username"
                        className="rounded-l-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>skaddosh/{username || "username"}</span>
                      {username ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          asChild
                        >
                          <a href={`/${username}`}>
                            View profile <ArrowUpRightIcon className="size-3" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Tell people a little about yourself..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/300
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://your-site.com"
                      type="url"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckIcon className="size-3.5" />
                      Saved!
                    </span>
                  )}
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfile.isPending}
                    size="sm"
                  >
                    {updateProfile.isPending && (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    )}
                    Save profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Preferences ─────────────────────────────────── */}
          {tab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Reading preferences</CardTitle>
                <CardDescription>
                  Personalise your skaddosh experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language */}
                <div className="space-y-2">
                  <Label>Preferred reading language</Label>
                  <div className="flex flex-wrap gap-2">
                    {SITE_LANGS.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        aria-pressed={prefLang === l.code}
                        onClick={() => {
                          setPrefLang(l.code);
                          setLang(l.code);
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          l.code === "ar" ? "font-arabic" : "",
                          prefLang === l.code
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                {/* Theme */}
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose how the app looks on this device. Current:{" "}
                    {resolvedTheme ?? theme ?? "system"}.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { value: "system", label: "System", icon: MonitorIcon },
                      { value: "light", label: "Light", icon: SunIcon },
                      { value: "dark", label: "Dark", icon: MoonIcon },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          theme === value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                {/* Content categories */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TagIcon className="size-4 text-muted-foreground" />
                    <Label>Content categories you care about</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We will surface more works tagged with these topics.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={categories.includes(c)}
                        onClick={() => toggleCategory(c)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize",
                          categories.includes(c)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        {c.replace(/-/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckIcon className="size-3.5" />
                      Saved!
                    </span>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updateSettings.isPending}
                    size="sm"
                  >
                    {updateSettings.isPending && (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    )}
                    Save preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Notifications ───────────────────────────────── */}
          {tab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose what emails skaddosh sends you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  {
                    label: "Activity notifications",
                    desc: "Kudos, comments, new followers.",
                    value: emailNotif,
                    set: setEmailNotif,
                  },
                  {
                    label: "Marketing emails",
                    desc: "Platform announcements and featured works.",
                    value: marketingEmails,
                    set: setMarketingEmails,
                  },
                ].map(({ label, desc, value, set }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      aria-label={label}
                      onClick={() => set(!value)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        value ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform",
                          value ? "translate-x-4" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckIcon className="size-3.5" />
                      Saved!
                    </span>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updateSettings.isPending}
                    size="sm"
                  >
                    {updateSettings.isPending && (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Privacy ─────────────────────────────────────── */}
          {tab === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>
                  Control who can see your activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  {
                    label: "Public profile",
                    desc: "Other users can view your profile page.",
                    value: profilePublic,
                    set: setProfilePublic,
                  },
                  {
                    label: "Show Cold Kudos",
                    desc: "Display sent/shared work Kudos on your public profile. Purchased Hot Kudos stay private.",
                    value: showKudos,
                    set: setShowKudos,
                  },
                ].map(({ label, desc, value, set }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      aria-label={label}
                      onClick={() => set(!value)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        value ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform",
                          value ? "translate-x-4" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckIcon className="size-3.5" />
                      Saved!
                    </span>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updateSettings.isPending}
                    size="sm"
                  >
                    {updateSettings.isPending && (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
